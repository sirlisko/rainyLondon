"""Handler for MongoDB."""
import logging
import os

import pymongo

logger = logging.getLogger(__name__)


def _get_env():
    """Return an environment object."""
    class Environment:
        """Environment object."""

        def __init__(self):
            """Initializer."""
            self.logger = logging.getLogger(__name__)
            try:
                self.host = os.environ['MONGO_HOST']
            except KeyError as e:
                self.logger.debug(e)
                self.host = None
            try:
                self.user = os.environ['MONGO_USER']
            except KeyError as e:
                self.logger.debug(e)
                self.user = None
            try:
                self.pwd = os.environ['MONGO_PASSWORD']
            except KeyError as e:
                self.logger.debug(e)
                self.pwd = None
    return Environment()


def connect(
        db_name, host=None, port=27017,
        auth=True, user=None, pwd=None, source='admin', env=None):
    """Connect to a MongoDB database."""
    if not env:
        env = _get_env()

    if not host:
        logger.debug('Host is none.')
        if not env.host:
            return
        host = env.host

    if not db_name:
        logger.debug('Database is none.')
        return

    if auth is True:
        if not user:
            logger.debug('User is none.')
            if not env.user:
                return
            user = env.user

        if not pwd:
            logger.debug('Password is none.')
            if not env.pwd:
                return
            pwd = env.pwd  # pragma: no cover

        return _connect_auth(  # pragma: no cover
            host, port, db_name, user, pwd, source)

    if auth is False:  # pragma: no cover
        return _connect_no_auth(
            host, port, db_name)


def _connect_no_auth(host, port, db_name):  # pragma: no cover
    """Connect without authentication."""
    try:
        client = pymongo.MongoClient(host=host, port=port, connect=True)
    except pymongo.errors.ConnectionFailure as e:
        logger.error(e)
        return

    return client[db_name]


def _connect_auth(host, port, db_name, user, pwd, source):  # pragma: no cover
    """Connect with authentication."""
    try:
        client = pymongo.MongoClient(host=host, port=port, connect=True)
    except pymongo.errors.ConnectionFailure as e:
        logger.error(e)
        return

    try:
        client[db_name].authenticate(
            name=user, password=pwd, source=source)
    except pymongo.errors.PyMongoError as e:
        logger.error(e)
        return

    return client[db_name]
