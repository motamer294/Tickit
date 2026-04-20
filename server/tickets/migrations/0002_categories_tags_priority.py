# Generated migration for Categories, Tags, and Priority refactor

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0001_initial'),
    ]

    operations = [
        # Create Category model
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('color', models.CharField(default='#007bff', max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'Categories',
                'ordering': ['name'],
            },
        ),
        # Create Tag model
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('color', models.CharField(default='#6c757d', max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        # Update Ticket model
        migrations.AlterField(
            model_name='ticket',
            name='priority',
            field=models.CharField(
                choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent')],
                db_index=True,
                default='MEDIUM',
                max_length=10
            ),
        ),
        migrations.RemoveField(
            model_name='ticket',
            name='category',
        ),
        migrations.AddField(
            model_name='ticket',
            name='category',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tickets',
                to='tickets.category',
                db_index=True
            ),
        ),
        migrations.AddField(
            model_name='ticket',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='tickets', to='tickets.tag'),
        ),
    ]
