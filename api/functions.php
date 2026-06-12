<?php

declare(strict_types=1);

function app_add_notification(string $message, string $audience = 'all'): void
{
    db()->prepare(
        'INSERT INTO notifications (message, audience) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE audience = VALUES(audience), created_at = NOW()'
    )
        ->execute([$message, $audience]);
}

function app_register_user(array $data): array
{
    require_fields($data, ['firstName', 'lastName', 'agentId', 'email', 'password']);

    if (empty($data['termsAccepted'])) {
        json_response(['ok' => false, 'message' => 'You must agree to the Terms of Service and Privacy Policy.'], 422);
    }

    $agentId = clean_string($data['agentId']);
    $email = clean_string($data['email']);

    $stmt = db()->prepare('SELECT id FROM users WHERE (agent_id = ? OR email = ?) AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([$agentId, $email]);

    if ($stmt->fetch()) {
        json_response(['ok' => false, 'message' => 'Agent ID or email already registered.'], 409);
    }

    $stmt = db()->prepare(
        'INSERT INTO users (first_name, last_name, agent_id, email, password_hash, role, terms_accepted_at)
         VALUES (?, ?, ?, ?, ?, "user", NOW())'
    );
    $stmt->execute([
        clean_string($data['firstName']),
        clean_string($data['lastName']),
        $agentId,
        $email,
        password_hash((string) $data['password'], PASSWORD_DEFAULT),
    ]);

    app_add_notification('New user registered: ' . $agentId, 'admin');

    return ['ok' => true, 'message' => 'Registration successful. Please login.'];
}

function app_login_user(array $data): array
{
    require_fields($data, ['identifier', 'password']);

    $identifier = clean_string($data['identifier']);
    $stmt = db()->prepare('SELECT * FROM users WHERE (agent_id = ? OR email = ?) AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify((string) $data['password'], (string) $user['password_hash'])) {
        json_response(['ok' => false, 'message' => 'Invalid Agent ID / Email or Password.'], 401);
    }

    if ((int) $user['banned'] === 1) {
        json_response(['ok' => false, 'message' => 'Your account has been banned.'], 403);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $user['id']]);

    $token = bin2hex(random_bytes(32));
    $cookieLifetime = !empty($data['rememberMe']) ? time() + (86400 * 30) : 0;

    db()->prepare('UPDATE users SET remember_token_hash = ? WHERE id = ?')
        ->execute([hash('sha256', $token), (int) $user['id']]);
    setcookie('awv_remember', $token, $cookieLifetime, '/', '', false, true);

    return ['ok' => true, 'user' => public_user($user)];
}

function app_logout_user(): array
{
    $user = current_user(false);

    if ($user) {
        db()->prepare('UPDATE users SET remember_token_hash = NULL WHERE id = ?')->execute([(int) $user['id']]);
    }

    $_SESSION = [];
    session_destroy();
    setcookie('awv_remember', '', time() - 3600, '/');

    return ['ok' => true];
}

function app_reset_password(array $data): array
{
    require_fields($data, ['email', 'password']);

    if ((string) $data['password'] !== (string) ($data['confirmPassword'] ?? '')) {
        json_response(['ok' => false, 'message' => 'Password confirmation does not match.'], 422);
    }

    $stmt = db()->prepare('UPDATE users SET password_hash = ?, remember_token_hash = NULL WHERE email = ? AND deleted_at IS NULL');
    $stmt->execute([
        password_hash((string) $data['password'], PASSWORD_DEFAULT),
        clean_string($data['email']),
    ]);

    return ['ok' => true, 'message' => 'If the email exists, the password has been updated.'];
}

function app_dashboard_payload(array $user): array
{
    $stats = [
        'heroes' => (int) db()->query('SELECT COUNT(*) FROM heroes')->fetchColumn(),
        'movies' => (int) db()->query('SELECT COUNT(*) FROM movies')->fetchColumn(),
        'posts' => (int) db()->query('SELECT COUNT(*) FROM posts')->fetchColumn(),
        'users' => (int) db()->query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL')->fetchColumn(),
    ];

    $heroes = list_heroes(['search' => '', 'category' => 'All Heroes'], $user);
    $movies = list_movies(['search' => '', 'phase' => 'All'], $user);
    $posts = list_posts(['sort' => 'popular'], $user);

    return [
        'ok' => true,
        'user' => public_user($user),
        'stats' => $stats,
        'heroOfWeek' => $heroes[0] ?? null,
        'heroes' => array_slice($heroes, 0, 4),
        'movies' => array_slice($movies, 0, 4),
        'posts' => array_slice($posts, 0, 3),
        'notifications' => notifications_for($user),
    ];
}

function app_toggle_favorite(array $user, array $data): array
{
    require_fields($data, ['type', 'id']);

    $type = clean_string($data['type']);
    $id = (int) $data['id'];

    if (!in_array($type, ['hero', 'movie'], true)) {
        json_response(['ok' => false, 'message' => 'Invalid favorite type.'], 422);
    }

    $stmt = db()->prepare('SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ? LIMIT 1');
    $stmt->execute([(int) $user['id'], $type, $id]);
    $favorite = $stmt->fetch();

    if ($favorite) {
        db()->prepare('DELETE FROM favorites WHERE id = ?')->execute([(int) $favorite['id']]);
        return ['ok' => true, 'favorite' => false];
    }

    db()->prepare('INSERT INTO favorites (user_id, item_type, item_id) VALUES (?, ?, ?)')
        ->execute([(int) $user['id'], $type, $id]);

    return ['ok' => true, 'favorite' => true];
}

function app_update_settings(array $user, array $data): array
{
    db()->prepare('UPDATE users SET mute_notifications = ? WHERE id = ?')
        ->execute([(int) !empty($data['muteNotifications']), (int) $user['id']]);

    return ['ok' => true];
}

function app_delete_own_account(array $user): array
{
    db()->prepare('UPDATE users SET deleted_at = NOW(), remember_token_hash = NULL WHERE id = ?')
        ->execute([(int) $user['id']]);

    $_SESSION = [];
    session_destroy();
    setcookie('awv_remember', '', time() - 3600, '/');

    return ['ok' => true];
}
