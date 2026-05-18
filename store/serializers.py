from rest_framework import serializers
from django.conf import settings
from django.utils.text import slugify
from django.contrib.auth.models import User
from .models import Post, PostMedia, Category, UserProfile, Order
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'phone']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        phone = validated_data.pop('phone')
        password = validated_data.pop('password')
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
        )
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.full_name = full_name
        profile.phone = phone
        profile.role = 'customer'
        profile.save()
        return user
class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        try:
            token['role'] = user.profile.role
            token['full_name'] = user.profile.full_name
        except Exception as e:
            print("PROFILE ERROR:", e)
            token['role'] = 'admin' if user.is_superuser else 'customer'
            token['full_name'] = user.username
        return token

class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['full_name', 'phone', 'role', 'email']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class CustomerSearchSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'full_name', 'phone', 'email']


class OrderPostChoiceSerializer(serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'title', 'price', 'is_available', 'cover_image']

    def get_cover_image(self, obj):
        request = self.context.get('request')
        cover = obj.media.filter(is_cover=True, media_type='image').first()
        if not cover:
            cover = obj.media.filter(media_type='image').first()
        if cover and request:
            return request.build_absolute_uri(cover.file.url)
        return None


class OrderSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(profile__role='customer'),
        source='customer', required=False, allow_null=True,
    )
    post_id = serializers.PrimaryKeyRelatedField(
        queryset=Post.objects.all(), source='post', required=False, allow_null=True,
    )
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    post_title = serializers.SerializerMethodField()

    guest_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    custom_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True,
    )
    advance_payment = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True,
    )

    class Meta:
        model = Order
        fields = [
            'id', 'customer_id', 'post_id', 'product_name', 'guest_name', 'address',
            'custom_sizing', 'custom_price', 'advance_payment',
            'customer_name', 'customer_email', 'customer_phone', 'post_title',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['product_name', 'customer_name', 'customer_email', 'customer_phone', 'post_title']

    def get_customer_name(self, obj):
        if obj.customer_id:
            try:
                return obj.customer.profile.full_name
            except Exception:
                return obj.customer.username
        return (obj.guest_name or '').strip() or None

    def get_customer_email(self, obj):
        return obj.customer.email if obj.customer_id else None

    def get_customer_phone(self, obj):
        if not obj.customer_id:
            return None
        try:
            return obj.customer.profile.phone
        except Exception:
            return None

    def get_post_title(self, obj):
        return obj.post.title if obj.post_id else None

    def validate_custom_sizing(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Custom sizing must be a list of rows.')
        cleaned = []
        for i, row in enumerate(value):
            if not isinstance(row, dict):
                raise serializers.ValidationError(f'Row {i + 1} must be an object with label and value.')
            label = str(row.get('label', '')).strip()
            val = str(row.get('value', '')).strip()
            if label or val:
                cleaned.append({'label': label, 'value': val})
        return cleaned

    def validate(self, attrs):
        post = attrs.get('post')
        if self.instance is None and not post:
            raise serializers.ValidationError({'post_id': 'Please select a product.'})

        guest_name = attrs.get('guest_name')
        if guest_name is not None:
            guest_name = guest_name.strip()
            attrs['guest_name'] = guest_name
        elif self.instance:
            guest_name = (self.instance.guest_name or '').strip()
        else:
            guest_name = ''

        customer = attrs.get('customer')
        if customer is None and self.instance and 'customer' not in self.initial_data and 'customer_id' not in self.initial_data:
            customer = self.instance.customer

        if customer and guest_name:
            attrs['guest_name'] = ''

        if self.instance is None:
            if not customer and not guest_name:
                raise serializers.ValidationError(
                    'Select a customer or enter a name only.'
                )
        elif not customer and not guest_name and not self.instance.customer_id and not (self.instance.guest_name or '').strip():
            raise serializers.ValidationError(
                'Select a customer or enter a name only.'
            )

        for field in ('custom_price', 'advance_payment'):
            val = attrs.get(field)
            if val is not None and val < 0:
                raise serializers.ValidationError({field: 'Amount cannot be negative.'})

        return attrs

    def _apply_product_name(self, attrs):
        post = attrs.get('post')
        if post is not None:
            attrs['product_name'] = post.title
        elif self.instance and 'post' not in attrs:
            pass
        elif self.instance:
            attrs.setdefault('product_name', self.instance.product_name)
        return attrs

    def create(self, validated_data):
        validated_data = self._apply_product_name(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._apply_product_name(validated_data)
        return super().update(instance, validated_data)


class PostMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PostMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'is_cover', 'order']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class PostSerializer(serializers.ModelSerializer):
    media = PostMediaSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False
    )
    cover_image = serializers.SerializerMethodField()
    whatsapp_link = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'title', 'description', 'price', 'category', 'category_id',
            'whatsapp_link', 'owner_name', 'is_available', 'cover_image',
            'media', 'created_at', 'updated_at'
        ]

    def get_cover_image(self, obj):
        request = self.context.get('request')
        cover = obj.media.filter(is_cover=True, media_type='image').first()
        if not cover:
            cover = obj.media.filter(media_type='image').first()
        if cover and request:
            return request.build_absolute_uri(cover.file.url)
        return None

    def get_whatsapp_link(self, obj):
        import re
        import urllib.parse

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        raw = getattr(settings, 'COMPANY_WHATSAPP', '') or ''
        if not raw:
            return None
        phone = re.sub(r'\D', '', str(raw))
        if not phone:
            return None
        base = (getattr(settings, 'FRONTEND_BASE_URL', '') or 'http://localhost:3000').rstrip('/')
        product_url = f"{base}/post/{obj.pk}"
        message = f"Hi! I'm interested in this product: {product_url}"
        return f"https://wa.me/{phone}?text={urllib.parse.quote(message)}"

    def get_owner_name(self, obj):
        try:
            return obj.owner.profile.full_name
        except Exception:
            return obj.owner.username


class PostCreateSerializer(serializers.ModelSerializer):
    new_category_name = serializers.CharField(
        required=False, allow_blank=True, write_only=True, max_length=100,
        help_text='If set, creates or uses a category with this name (overrides category id).',
    )

    class Meta:
        model = Post
        fields = ['id', 'title', 'description', 'price', 'category', 'new_category_name', 'is_available']

    def validate(self, attrs):
        new_name = (attrs.pop('new_category_name', '') or '').strip()
        if new_name:
            base_slug = slugify(new_name) or 'category'
            slug = base_slug
            for n in range(40):
                cat, created = Category.objects.get_or_create(
                    slug=slug,
                    defaults={'name': new_name},
                )
                if created or cat.name.strip().lower() == new_name.lower():
                    attrs['category'] = cat
                    break
                slug = f'{base_slug}-{n + 2}'
            else:
                raise serializers.ValidationError({'new_category_name': 'Could not assign a unique category slug.'})
        return attrs

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)