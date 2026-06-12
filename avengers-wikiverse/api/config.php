<?php

declare(strict_types=1);

const DB_HOST = 'localhost';
const DB_NAME = 'avengers_wikiverse';
const DB_USER = 'root';
const DB_PASS = '462006apipnurr';
const DB_CHARSET = 'utf8mb4';

const APP_TIMEZONE = 'Asia/Jakarta';
const UPLOAD_DIR = __DIR__ . '/../uploads';
const UPLOAD_URL = 'uploads';
const SESSION_DIR = __DIR__ . '/../storage/sessions';

date_default_timezone_set(APP_TIMEZONE);
