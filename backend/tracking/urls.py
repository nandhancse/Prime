from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BodyMeasurementViewSet,
    DashboardAnalyticsView,
    PersonalRecordViewSet,
    StreakSummaryView,
    XPSummaryView,
)


router = DefaultRouter()
router.register('records', PersonalRecordViewSet, basename='personal-record')
router.register(
    'progress/measurements',
    BodyMeasurementViewSet,
    basename='body-measurement',
)

urlpatterns = [
    path('analytics/dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('analytics/xp/', XPSummaryView.as_view(), name='xp-summary'),
    path('analytics/streak/', StreakSummaryView.as_view(), name='streak-summary'),
    path('', include(router.urls)),
]
