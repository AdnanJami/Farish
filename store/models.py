from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    ROLE_CHOICES = [('admin', 'Admin'), ('customer', 'Customer')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, help_text="WhatsApp number with country code e.g. +8801XXXXXXXXX")
    full_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.full_name} ({self.role})"


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"


class Post(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']


class PostMedia(models.Model):
    MEDIA_TYPE_CHOICES = [('image', 'Image'), ('video', 'Video')]
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='media')
    file = models.FileField(upload_to='posts/%Y/%m/')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='image')
    is_cover = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']


class Order(models.Model):
    STATUS_CHOICES = [
        ('preparing', 'Preparing'),
        ('delivering', 'Delivering'),
        ('delivered', 'Delivered'),
    ]
    customer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders',
    )
    post = models.ForeignKey(
        Post, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders',
    )
    product_name = models.CharField(max_length=255)
    guest_name = models.CharField(
        max_length=255, blank=True,
        help_text='Customer name when no registered user is linked.',
    )
    address = models.TextField(blank=True)
    custom_sizing = models.JSONField(default=list, blank=True)
    custom_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    advance_payment = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='preparing')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product_name} — {self.get_customer_display()}"

    def get_customer_display(self):
        if self.customer_id:
            try:
                return self.customer.profile.full_name
            except Exception:
                return self.customer.email or self.customer.username
        if self.guest_name.strip():
            return self.guest_name.strip()
        return 'No customer'

    class Meta:
        ordering = ['-created_at']