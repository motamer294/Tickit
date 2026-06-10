from django.db import migrations, models


def mark_existing_tickets_done(apps, schema_editor):
    """Existing tickets already have AI data — mark them DONE."""
    Ticket = apps.get_model('tickets', 'Ticket')
    Ticket.objects.update(ai_status='DONE')


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0005_auditlog_sla'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='ai_status',
            field=models.CharField(
                choices=[
                    ('PENDING',    'Pending'),
                    ('PROCESSING', 'Processing'),
                    ('DONE',       'Done'),
                    ('FAILED',     'Failed'),
                ],
                default='PENDING',
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.RunPython(mark_existing_tickets_done, migrations.RunPython.noop),
    ]
