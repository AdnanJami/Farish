from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0005_order_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='guest_name',
            field=models.CharField(
                blank=True,
                help_text='Customer name when no registered user is linked.',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='custom_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='advance_payment',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
