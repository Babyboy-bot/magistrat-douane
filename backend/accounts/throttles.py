from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class ResendVerificationThrottle(UserRateThrottle):
    scope = "resend_verification"
