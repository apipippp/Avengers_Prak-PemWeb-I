<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (!is_dir(SESSION_DIR)) {
    mkdir(SESSION_DIR, 0775, true);
}

if (session_status() === PHP_SESSION_NONE) {
    session_save_path(SESSION_DIR);
    session_name('awv_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function clean_string(mixed $value): string
{
    return trim((string) $value);
}

function request_data(): array
{
    if (!empty($_POST)) {
        return $_POST;
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);

    return is_array($data) ? $data : [];
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function require_fields(array $data, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            json_response(['ok' => false, 'message' => "Field {$field} is required."], 422);
        }
    }
}

function current_user(bool $required = true, ?string $role = null): ?array
{
    $userId = $_SESSION['user_id'] ?? null;

    if (!$userId && isset($_COOKIE['awv_remember'])) {
        $hash = hash('sha256', (string) $_COOKIE['awv_remember']);
        $stmt = db()->prepare('SELECT * FROM users WHERE remember_token_hash = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$hash]);
        $remembered = $stmt->fetch();

        if ($remembered) {
            $_SESSION['user_id'] = (int) $remembered['id'];
            $userId = (int) $remembered['id'];
        }
    }

    if (!$userId) {
        if ($required) {
            json_response(['ok' => false, 'message' => 'Please login first.'], 401);
        }
        return null;
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([(int) $userId]);
    $user = $stmt->fetch();

    if (!$user || (int) $user['banned'] === 1) {
        $_SESSION = [];
        session_destroy();
        setcookie('awv_remember', '', time() - 3600, '/');

        if ($required) {
            json_response(['ok' => false, 'message' => 'Account is not available.'], 403);
        }
        return null;
    }

    if ($role && $user['role'] !== $role) {
        json_response(['ok' => false, 'message' => 'Forbidden.'], 403);
    }

    return $user;
}

function public_user(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'name' => trim($user['first_name'] . ' ' . $user['last_name']),
        'agentId' => $user['agent_id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'avatarUrl' => $user['avatar_url'] ?: 'assets/images/user-profile/profile-default.png',
        'banned' => (bool) $user['banned'],
        'muteNotifications' => (bool) $user['mute_notifications'],
        'createdAt' => $user['created_at'],
    ];
}

