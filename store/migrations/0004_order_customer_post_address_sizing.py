from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def convert_sizing_text_to_json(apps, schema_editor):
    Order = apps.get_model('store', 'Order')
    for order in Order.objects.all():
        raw = order.custom_sizing
        if isinstance(raw, list):
            continue
        text = (raw or '').strip() if isinstance(raw, str) else ''
        if text:
            order.custom_sizing_new = [{'label': 'Notes', 'value': text}]
        else:
            order.custom_sizing_new = []
        order.save(update_fields=['custom_sizing_new'])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('store', '0003_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='address',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='customer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='orders',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='post',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='orders',
                to='store.post',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='custom_sizing_new',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(convert_sizing_text_to_json, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='order',
            name='custom_sizing',
        ),
        migrations.RenameField(
            model_name='order',
            old_name='custom_sizing_new',
            new_name='custom_sizing',
        ),
    ]
