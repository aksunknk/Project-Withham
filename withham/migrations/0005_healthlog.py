# Generated by Django 5.2 on 2025-04-23 06:41

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("withham", "0004_post_likes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="HealthLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "log_date",
                    models.DateField(
                        default=django.utils.timezone.now, verbose_name="記録日"
                    ),
                ),
                (
                    "weight_g",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        max_digits=4,
                        null=True,
                        verbose_name="体重(g)",
                    ),
                ),
                (
                    "notes",
                    models.TextField(blank=True, null=True, verbose_name="様子・メモ"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="作成日時"),
                ),
                (
                    "hamster",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="health_logs",
                        to="withham.hamster",
                        verbose_name="対象ハムスター",
                    ),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="recorded_health_logs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="記録者",
                    ),
                ),
            ],
            options={
                "verbose_name": "健康記録",
                "verbose_name_plural": "健康記録",
                "ordering": ["-log_date", "-created_at"],
            },
        ),
    ]
