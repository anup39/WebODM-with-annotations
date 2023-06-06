# Generated by Django 2.2.27 on 2023-06-06 06:25

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0040_auto_20230531_1223'),
    ]

    operations = [
        migrations.CreateModel(
            name='StandardCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='In which standard category you want to seperate your project layer', max_length=255, verbose_name='Name')),
                ('description', models.TextField(blank=True, default='', help_text='Description about this category', verbose_name='Description')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, help_text='Creation date', verbose_name='Created at')),
                ('publised', models.BooleanField(default=False)),
                ('view_name', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('project', models.ForeignKey(default=1, help_text='Standard Category related to the project', on_delete=django.db.models.deletion.PROTECT, to='app.Project', verbose_name='Project')),
            ],
        ),
        migrations.CreateModel(
            name='SubCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='In which Sub category you want to seperate your project layer', max_length=255, verbose_name='Name')),
                ('description', models.TextField(blank=True, default='', help_text='Description about this category', verbose_name='Description')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, help_text='Creation date', verbose_name='Created at')),
                ('publised', models.BooleanField(default=False)),
                ('view_name', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('project', models.ForeignKey(help_text='Sub Category related to the project', on_delete=django.db.models.deletion.PROTECT, to='app.Project', verbose_name='Project')),
                ('standard_category', models.ForeignKey(help_text='Standard Category related to the project', on_delete=django.db.models.deletion.PROTECT, to='app.StandardCategory', verbose_name='Standard Category')),
            ],
        ),
        migrations.AddField(
            model_name='measuringcategory',
            name='standard_category',
            field=models.ForeignKey(default=1, help_text='Standard Category related to the project', on_delete=django.db.models.deletion.PROTECT, to='app.StandardCategory', verbose_name='Standard Category'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='measuringcategory',
            name='sub_category',
            field=models.ForeignKey(default=1, help_text='Sub Category related to the project', on_delete=django.db.models.deletion.PROTECT, to='app.SubCategory', verbose_name='Sub Category'),
            preserve_default=False,
        ),
    ]
