from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import Post, PostMedia, Category, UserProfile, Order


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ['full_name', 'phone', 'role']


class CustomUserAdmin(UserAdmin):
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'get_full_name', 'get_role', 'get_phone', 'is_staff']

    def get_full_name(self, obj):
        try:
            return obj.profile.full_name
        except Exception:
            return '-'
    get_full_name.short_description = 'Full Name'

    def get_role(self, obj):
        try:
            return obj.profile.role.upper()
        except Exception:
            return '-'
    get_role.short_description = 'Role'

    def get_phone(self, obj):
        try:
            return obj.profile.phone
        except Exception:
            return '-'
    get_phone.short_description = 'WhatsApp'


# Unregister default User and register custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


class PostMediaInline(admin.TabularInline):
    model = PostMedia
    extra = 1
    fields = ['file', 'media_type', 'is_cover', 'order']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'category', 'price', 'is_available', 'created_at']
    list_filter = ['is_available', 'category', 'created_at']
    search_fields = ['title', 'description']
    inlines = [PostMediaInline]
    list_editable = ['is_available']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'product_name', 'get_customer', 'custom_price', 'advance_payment',
        'status', 'created_at',
    ]
    search_fields = [
        'product_name', 'guest_name', 'address',
        'customer__email', 'customer__profile__full_name',
    ]
    list_filter = ['created_at']
    raw_id_fields = ['customer', 'post']

    @admin.display(description='Customer')
    def get_customer(self, obj):
        return obj.get_customer_display()

    @admin.display(description='Address')
    def address_short(self, obj):
        text = (obj.address or '').strip()
        if len(text) > 50:
            return text[:50] + '…'
        return text or '—'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'get_email', 'phone', 'role']
    list_filter = ['role']
    list_editable = ['role']
    search_fields = ['full_name', 'phone', 'user__email']

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'