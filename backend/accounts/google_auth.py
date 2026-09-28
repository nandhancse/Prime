from django.conf import settings
from google.auth.transport import requests
from google.oauth2 import id_token


class GoogleTokenError(ValueError):
    pass


def verify_google_identity_token(credential):
    if not settings.GOOGLE_CLIENT_IDS:
        raise GoogleTokenError('Google login is not configured.')

    for audience in settings.GOOGLE_CLIENT_IDS:
        try:
            claims = id_token.verify_oauth2_token(
                credential,
                requests.Request(),
                audience=audience,
            )
        except ValueError:
            continue

        if claims.get('iss') not in {'accounts.google.com', 'https://accounts.google.com'}:
            continue
        return claims

    raise GoogleTokenError('Invalid Google credential.')
