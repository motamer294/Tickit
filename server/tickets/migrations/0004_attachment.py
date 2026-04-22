# Generated migration for Attachment model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0003_add_pending_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(max_length=255, upload_to='tickets/%Y/%m/%d/')),
                ('filename', models.CharField(max_length=255)),
                ('file_size', models.BigIntegerField()),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='tickets.ticket')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_attachments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Attachments',
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
