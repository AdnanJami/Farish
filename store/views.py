from rest_framework import viewsets, permissions, status, parsers, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from django.contrib.auth.models import User
from django.db.models import Q
from .models import Post, PostMedia, Category, UserProfile, Order
from .serializers import (
    PostSerializer, PostCreateSerializer, PostMediaSerializer,
    CategorySerializer, RegisterSerializer, UserProfileSerializer, CustomTokenSerializer,
    OrderSerializer, CustomerSearchSerializer, OrderPostChoiceSerializer,
)


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == 'admin' or request.user.is_superuser
        except Exception:
            return request.user.is_superuser


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Admin can edit any post
        try:
            if request.user.profile.role == 'admin' or request.user.is_superuser:
                return True
        except Exception:
            if request.user.is_superuser:
                return True
        # Owner can edit their own post
        return obj.owner == request.user





class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "Account created successfully. Please log in."},
            status=status.HTTP_201_CREATED
        )


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return (
            Order.objects.select_related('customer', 'customer__profile', 'post')
            .order_by('-created_at')
        )

    @action(detail=False, methods=['get'], url_path='search-customers')
    def search_customers(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return Response([])
        qs = (
            UserProfile.objects.filter(role='customer')
            .select_related('user')
            .filter(
                Q(full_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__username__icontains=q)
            )
            .order_by('full_name')[:20]
        )
        return Response(CustomerSearchSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='product-choices')
    def product_choices(self, request):
        qs = Post.objects.prefetch_related('media').order_by('-created_at')
        return Response(OrderPostChoiceSerializer(qs, many=True, context={'request': request}).data)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminRole()]


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = Post.objects.prefetch_related('media').select_related('category', 'owner__profile')

        try:
            is_admin = (
                self.request.user.is_authenticated and (
                    self.request.user.profile.role == 'admin' or
                    self.request.user.is_superuser
                )
            )
        except Exception:
            is_admin = self.request.user.is_authenticated and self.request.user.is_superuser

        # Admins see all posts, everyone else sees only available
        if not is_admin:
            qs = qs.filter(is_available=True)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)

        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PostCreateSerializer
        return PostSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]

    def create(self, request, *args, **kwargs):
        try:
            is_admin = request.user.profile.role == 'admin' or request.user.is_superuser
        except Exception:
            is_admin = request.user.is_superuser
        if not is_admin:
            return Response({'error': 'Only admins can create posts.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser])
    def upload_media(self, request, pk=None):
        post = self.get_object()
        files = request.FILES.getlist('files')
        media_type = request.data.get('media_type', 'image')
        is_cover = request.data.get('is_cover', 'false').lower() == 'true'
        created = []
        for i, f in enumerate(files):
            media = PostMedia.objects.create(
                post=post, file=f, media_type=media_type,
                is_cover=(is_cover and i == 0),
                order=post.media.count() + i
            )
            created.append(PostMediaSerializer(media, context={'request': request}).data)
        return Response(created, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='media/(?P<media_id>[^/.]+)')
    def delete_media(self, request, pk=None, media_id=None):
        post = self.get_object()
        try:
            media = post.media.get(id=media_id)
            media.file.delete()
            media.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PostMedia.DoesNotExist:
            return Response({'error': 'Media not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_posts(self, request):
        try:
            is_admin = request.user.profile.role == 'admin' or request.user.is_superuser
        except Exception:
            is_admin = request.user.is_superuser

        if is_admin:
            qs = Post.objects.all().prefetch_related('media').select_related('category', 'owner__profile')
        else:
            qs = Post.objects.filter(owner=request.user).prefetch_related('media').select_related('category')

        serializer = PostSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)