<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

function redirect_login(string $message): never
{
    header('Location: ../pages/login/login.html?error=' . urlencode($message));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_login('Please login from the login page.');
}

$identifier = trim((string) ($_POST['identifier'] ?? ''));
$password = (string) ($_POST['password'] ?? '');
$rememberMe = isset($_POST['rememberMe']);

if ($identifier === '' || $password === '') {
    redirect_login('Please fill all fields.');
}

try {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE (agent_id = ? OR email = ?) AND deleted_at IS NULL LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        redirect_login('Invalid Agent ID / Email or Password.');
    }

    if ((int) $user['banned'] === 1) {
        redirect_login('Your account has been banned.');
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $user['id']]);

    $token = bin2hex(random_bytes(32));
    $cookieLifetime = $rememberMe ? time() + (86400 * 30) : 0;

    $pdo->prepare('UPDATE users SET remember_token_hash = ? WHERE id = ?')
        ->execute([hash('sha256', $token), (int) $user['id']]);
    setcookie('awv_remember', $token, $cookieLifetime, '/', '', false, true);

    $target = $user['role'] === 'admin'
        ? '../pages/admin-dashboard/admin-dashboard.html'
        : '../pages/dashboard/dashboard.html';

    header('Location: ' . $target);
    exit;
} catch (Throwable $e) {
    redirect_login('Login failed: ' . $e->getMessage());
}
