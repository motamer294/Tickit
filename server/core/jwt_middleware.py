"""
JWT Authentication Middleware for Django Channels WebSocket
Extracts and validates JWT tokens from query strings
"""
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
import logging
import urllib.parse
import jwt

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_str):
    """Extract and validate JWT token, return User object"""
    try:
        from django.contrib.auth.models import AnonymousUser  # Import here
        from accounts.models import User  # Import here to avoid app registry issues

        # URL decode the token in case it's been encoded
        token_str = urllib.parse.unquote(token_str)

        # Decode and validate JWT using PyJWT
        # Use the same SECRET_KEY as Django
        payload = jwt.decode(
            token_str,
            settings.SECRET_KEY,
            algorithms=['HS256']
        )

        user_id = payload.get('user_id')

        if not user_id:
            logger.error(" No user_id in token")
            return AnonymousUser()

        # Get user from database
        user = User.objects.get(id=user_id)
        logger.info(f" JWT authenticated user: {user.username} (role: {user.role})")
        return user
    except jwt.ExpiredSignatureError:
        logger.error(" Token has expired")
        from django.contrib.auth.models import AnonymousUser
        return AnonymousUser()
    except jwt.InvalidTokenError as e:
        logger.error(f" Invalid token: {e}")
        from django.contrib.auth.models import AnonymousUser
        return AnonymousUser()
    except Exception as e:
        logger.error(f" Token validation error: {type(e).__name__}: {e}")
        from django.contrib.auth.models import AnonymousUser
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens.
    Supports two authentication methods:
    1. Legacy: token in query string: ws://host/path/?token=<jwt_token>
    2. Secure: token sent in message after connection (for /ws/unified/)

    For the unified endpoint, the middleware allows anonymous connections
    that will be authenticated later via message.
    """

    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser  # Import here

        # Extract token from query string (for legacy endpoints)
        query_string = scope.get('query_string', b'').decode()
        token = None

        logger.debug(f" Query string: {query_string}")

        # Parse query string to get token (fallback method)
        if query_string:
            try:
                # Parse as query string
                parsed = urllib.parse.parse_qs(query_string)
                if 'token' in parsed and parsed['token']:
                    token = parsed['token'][0]
            except Exception as e:
                logger.error(f" Error parsing query string: {e}")
                # Fallback to manual parsing
                for param in query_string.split('&'):
                    if param.startswith('token='):
                        token = param.split('=', 1)[1]
                        break

        # Authenticate user if token provided
        if token:
            logger.info(" Token found, authenticating...")
            user = await get_user_from_token(token)
            scope['user'] = user
        else:
            scope['user'] = AnonymousUser()
            logger.warning(" WebSocket connection without token")

        return await super().__call__(scope, receive, send)
