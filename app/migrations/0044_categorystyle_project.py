# Generated by Django 2.2.27 on 2023-06-10 17:47

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0043_auto_20230606_0638'),
    ]

    operations = [
        migrations.AddField(
            model_name='categorystyle',
            name='project',
            field=models.ForeignKey(blank=True, help_text='Style related to the project', null=True, on_delete=django.db.models.deletion.PROTECT, to='app.Project', verbose_name='Project'),
        ),
    ]
