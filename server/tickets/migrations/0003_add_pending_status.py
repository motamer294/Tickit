# Generated migration for adding PENDING status

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0002_categories_tags_priority'),
    ]

    operations = [
        # Alter the status field choices to include PENDING
        migrations.AlterField(
            model_name='ticket',
            name='status',
            field=models.CharField(
                choices=[
                    ('OPEN', 'Open'),
                    ('PENDING', 'Pending'),
                    ('IN_PROGRESS', 'In Progress'),
                    ('RESOLVED', 'Resolved'),
                    ('CLOSED', 'Closed'),
                ],
                db_index=True,
                default='OPEN',
                max_length=20,
            ),
        ),
    ]
