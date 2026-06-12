<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/functions.php';

header('Content-Type: application/json; charset=utf-8');

function upload_image(string $field, string $folder, string $fallback): string
{
    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) {
        return $fallback;
    }

    if ($_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        json_response(['ok' => false, 'message' => 'Image upload failed.'], 422);
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    $mime = mime_content_type($_FILES[$field]['tmp_name']);
    if (!isset($allowed[$mime])) {
        json_response(['ok' => false, 'message' => 'Only JPG, PNG, WEBP, or GIF images are allowed.'], 422);
    }

    $targetDir = UPLOAD_DIR . '/' . $folder;
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0775, true);
    }

    $filename = bin2hex(random_bytes(12)) . '.' . $allowed[$mime];
    $target = $targetDir . '/' . $filename;

    if (!move_uploaded_file($_FILES[$field]['tmp_name'], $target)) {
        json_response(['ok' => false, 'message' => 'Could not save uploaded image.'], 500);
    }

    return UPLOAD_URL . '/' . $folder . '/' . $filename;
}

function format_hero(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'realName' => $row['real_name'],
        'team' => $row['team'],
        'category' => $row['category'],
        'powers' => $row['powers'],
        'powerTags' => array_values(array_filter(array_map('trim', explode(',', (string) $row['power_tags'])))),
        'biography' => $row['biography'],
        'imageUrl' => $row['image_url'],
        'powerScore' => (int) $row['power_score'],
        'intelligenceScore' => (int) $row['intelligence_score'],
        'combatScore' => (int) $row['combat_score'],
        'speedScore' => (int) $row['speed_score'],
        'favorite' => isset($row['favorite_id']) && $row['favorite_id'] !== null,
        'updatedAt' => $row['updated_at'],
    ];
}

function format_movie(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'phase' => $row['phase'],
        'releaseDate' => $row['release_date'],
        'year' => (int) substr((string) $row['release_date'], 0, 4),
        'duration' => $row['duration'],
        'director' => $row['director'],
        'castMembers' => $row['cast_members'],
        'synopsis' => $row['synopsis'],
        'posterUrl' => $row['poster_url'],
        'rating' => $row['rating'],
        'favorite' => isset($row['favorite_id']) && $row['favorite_id'] !== null,
        'createdAt' => $row['created_at'],
    ];
}

function notifications_for(array $user): array
{
    if ((int) $user['mute_notifications'] === 1) {
        return [];
    }

    $stmt = db()->prepare(
        'SELECT id, message, audience, created_at AS createdAt
         FROM notifications
         WHERE audience IN ("all", ?)
         ORDER BY created_at DESC
         LIMIT 12'
    );
    $stmt->execute([$user['role']]);

    return $stmt->fetchAll();
}

function list_heroes(array $data, ?array $user): array
{
    $search = '%' . clean_string($data['search'] ?? '') . '%';
    $category = clean_string($data['category'] ?? 'All Heroes');
    $favorite = filter_var($data['favorite'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $params = [$user ? (int) $user['id'] : 0, $search, $search, $search];
    $where = 'WHERE (h.name LIKE ? OR h.real_name LIKE ? OR h.power_tags LIKE ?)';

    if ($category !== '' && !in_array(strtolower($category), ['all', 'all heroes'], true)) {
        $where .= ' AND (h.category = ? OR h.team = ?)';
        $params[] = $category;
        $params[] = $category;
    }

    if ($favorite) {
        $where .= ' AND f.id IS NOT NULL';
    }

    $sql = "SELECT h.*, f.id AS favorite_id
            FROM heroes h
            LEFT JOIN favorites f ON f.item_type = 'hero' AND f.item_id = h.id AND f.user_id = ?
            {$where}
            ORDER BY h.updated_at DESC, h.name ASC";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);

    return array_map('format_hero', $stmt->fetchAll());
}

function list_movies(array $data, ?array $user): array
{
    $search = '%' . clean_string($data['search'] ?? '') . '%';
    $phase = clean_string($data['phase'] ?? 'All');
    $favorite = filter_var($data['favorite'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $params = [$user ? (int) $user['id'] : 0, $search, $search, $search];
    $where = 'WHERE (m.title LIKE ? OR m.director LIKE ? OR m.cast_members LIKE ?)';

    if ($phase !== '' && strtolower($phase) !== 'all') {
        $where .= ' AND m.phase = ?';
        $params[] = $phase;
    }

    if ($favorite) {
        $where .= ' AND f.id IS NOT NULL';
    }

    $sql = "SELECT m.*, f.id AS favorite_id
            FROM movies m
            LEFT JOIN favorites f ON f.item_type = 'movie' AND f.item_id = m.id AND f.user_id = ?
            {$where}
            ORDER BY m.release_date DESC, m.created_at DESC";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);

    return array_map('format_movie', $stmt->fetchAll());
}

try {
    $action = $_GET['action'] ?? '';
    $data = request_data();

    if ($action === 'auth/register') {
        json_response(app_register_user($data));
    }

    if ($action === 'auth/login') {
        json_response(app_login_user($data));
    }

    if ($action === 'auth/logout') {
        json_response(app_logout_user());
    }

    if ($action === 'auth/me') {
        $user = current_user(false);
        json_response(['ok' => true, 'user' => $user ? public_user($user) : null]);
    }

    if ($action === 'notifications') {
        $user = current_user(true);
        json_response([
            'ok' => true,
            'user' => public_user($user),
            'notifications' => notifications_for($user),
        ]);
    }

    if ($action === 'auth/forgot-password') {
        json_response(app_reset_password($data));
    }

    if ($action === 'dashboard') {
        $user = current_user(true);
        json_response(app_dashboard_payload($user));
    }

    if ($action === 'heroes') {
        $user = current_user(true);
        json_response(['ok' => true, 'heroes' => list_heroes($_GET + $data, $user)]);
    }

    if ($action === 'heroes/detail') {
        $user = current_user(true);
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = db()->prepare(
            "SELECT h.*, f.id AS favorite_id
             FROM heroes h
             LEFT JOIN favorites f ON f.item_type = 'hero' AND f.item_id = h.id AND f.user_id = ?
             WHERE h.id = ?"
        );
        $stmt->execute([(int) $user['id'], $id]);
        $hero = $stmt->fetch();

        if (!$hero) {
            json_response(['ok' => false, 'message' => 'Hero not found.'], 404);
        }

        json_response(['ok' => true, 'hero' => format_hero($hero)]);
    }

    if ($action === 'heroes/create') {
        current_user(true, 'admin');
        require_fields($data, ['name', 'realName', 'team', 'powers', 'biography']);

        $image = upload_image('image', 'heroes', 'assets/images/placeholders/hero.svg');
        $stmt = db()->prepare(
            'INSERT INTO heroes (name, real_name, team, category, powers, power_tags, biography, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            clean_string($data['name']),
            clean_string($data['realName']),
            clean_string($data['team']),
            clean_string($data['category'] ?? $data['team']),
            clean_string($data['powers']),
            clean_string($data['powerTags'] ?? $data['powers']),
            clean_string($data['biography']),
            $image,
        ]);

        app_add_notification('New hero profile added: ' . clean_string($data['name']), 'all');

        json_response(['ok' => true, 'message' => 'Hero added successfully.']);
    }

    if ($action === 'heroes/update') {
        current_user(true, 'admin');
        require_fields($data, ['id', 'name', 'realName', 'team', 'powers', 'biography']);
        $id = (int) $data['id'];

        $existing = db()->prepare('SELECT image_url FROM heroes WHERE id = ?');
        $existing->execute([$id]);
        $row = $existing->fetch();
        if (!$row) {
            json_response(['ok' => false, 'message' => 'Hero not found.'], 404);
        }

        $image = upload_image('image', 'heroes', $row['image_url']);
        $stmt = db()->prepare(
            'UPDATE heroes
             SET name = ?, real_name = ?, team = ?, category = ?, powers = ?, power_tags = ?, biography = ?, image_url = ?
             WHERE id = ?'
        );
        $stmt->execute([
            clean_string($data['name']),
            clean_string($data['realName']),
            clean_string($data['team']),
            clean_string($data['category'] ?? $data['team']),
            clean_string($data['powers']),
            clean_string($data['powerTags'] ?? $data['powers']),
            clean_string($data['biography']),
            $image,
            $id
        ]);

        json_response(['ok' => true, 'message' => 'Hero updated successfully.']);
    }

    if ($action === 'movies') {
        $user = current_user(true);
        json_response(['ok' => true, 'movies' => list_movies($_GET + $data, $user)]);
    }

    if ($action === 'movies/detail') {
        $user = current_user(true);
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = db()->prepare(
            "SELECT m.*, f.id AS favorite_id
             FROM movies m
             LEFT JOIN favorites f ON f.item_type = 'movie' AND f.item_id = m.id AND f.user_id = ?
             WHERE m.id = ?"
        );
        $stmt->execute([(int) $user['id'], $id]);
        $movie = $stmt->fetch();

        if (!$movie) {
            json_response(['ok' => false, 'message' => 'Movie not found.'], 404);
        }

        json_response(['ok' => true, 'movie' => format_movie($movie)]);
    }

    if ($action === 'movies/create') {
        current_user(true, 'admin');
        require_fields($data, ['title', 'releaseDate', 'duration', 'director', 'castMembers', 'synopsis']);

        $poster = upload_image('image', 'movies', 'assets/images/placeholders/movie.svg');
        $date = clean_string($data['releaseDate']);
        $year = (int) substr($date, 0, 4);
        $phase = clean_string($data['phase'] ?? '');

        if ($phase === '') {
            $phase = $year <= 2012 ? 'Phase 1' : ($year <= 2015 ? 'Phase 2' : ($year <= 2019 ? 'Phase 3' : 'Phase 4'));
        }

        $stmt = db()->prepare(
            'INSERT INTO movies (title, phase, release_date, duration, director, cast_members, synopsis, poster_url, rating)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            clean_string($data['title']),
            $phase,
            $date,
            clean_string($data['duration']),
            clean_string($data['director']),
            clean_string($data['castMembers']),
            clean_string($data['synopsis']),
            $poster,
            clean_string($data['rating'] ?? 'N/A'),
        ]);

        app_add_notification('New movie archived: ' . clean_string($data['title']), 'all');

        json_response(['ok' => true, 'message' => 'Movie added successfully.']);
    }

    if ($action === 'movies/update') {
        current_user(true, 'admin');
        require_fields($data, ['id', 'title', 'releaseDate', 'duration', 'director', 'castMembers', 'synopsis']);
        $id = (int) $data['id'];

        $existing = db()->prepare('SELECT poster_url FROM movies WHERE id = ?');
        $existing->execute([$id]);
        $row = $existing->fetch();
        if (!$row) {
            json_response(['ok' => false, 'message' => 'Movie not found.'], 404);
        }

        $poster = upload_image('image', 'movies', $row['poster_url']);
        $date = clean_string($data['releaseDate']);
        $year = (int) substr($date, 0, 4);
        $phase = clean_string($data['phase'] ?? '');

        if ($phase === '') {
            $phase = $year <= 2012 ? 'Phase 1' : ($year <= 2015 ? 'Phase 2' : ($year <= 2019 ? 'Phase 3' : 'Phase 4'));
        }

        $stmt = db()->prepare(
            'UPDATE movies
             SET title = ?, phase = ?, release_date = ?, duration = ?, director = ?, cast_members = ?, synopsis = ?, poster_url = ?, rating = ?
             WHERE id = ?'
        );
        $stmt->execute([
            clean_string($data['title']),
            $phase,
            $date,
            clean_string($data['duration']),
            clean_string($data['director']),
            clean_string($data['castMembers']),
            clean_string($data['synopsis']),
            $poster,
            clean_string($data['rating'] ?? 'N/A'),
            $id
        ]);

        json_response(['ok' => true, 'message' => 'Movie updated successfully.']);
    }

    if ($action === 'favorites/toggle') {
        $user = current_user(true);
        json_response(app_toggle_favorite($user, $data));
    }

    if ($action === 'posts') {
        $user = current_user(true);
        json_response(['ok' => true, 'posts' => list_posts($_GET + $data, $user)]);
    }

    if ($action === 'posts/create') {
        $user = current_user(true);
        require_fields($data, ['title', 'body', 'category']);

        $stmt = db()->prepare('INSERT INTO posts (user_id, title, body, category) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            (int) $user['id'],
            clean_string($data['title']),
            clean_string($data['body']),
            clean_string($data['category']),
        ]);

        app_add_notification('New community post: ' . clean_string($data['title']), 'admin');

        json_response(['ok' => true, 'message' => 'Post published.']);
    }

    if ($action === 'posts/like') {
        $user = current_user(true);
        require_fields($data, ['id']);
        $postId = (int) $data['id'];
        $stmt = db()->prepare('SELECT id FROM post_likes WHERE user_id = ? AND post_id = ? LIMIT 1');
        $stmt->execute([(int) $user['id'], $postId]);

        if ($stmt->fetch()) {
            db()->prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?')->execute([(int) $user['id'], $postId]);
        } else {
            db()->prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)')->execute([(int) $user['id'], $postId]);
        }

        $likes = (int) db()->query('SELECT COUNT(*) FROM post_likes WHERE post_id = ' . $postId)->fetchColumn();
        json_response(['ok' => true, 'likes' => $likes]);
    }

    if ($action === 'admin/stats') {
        $user = current_user(true, 'admin');
        json_response([
            'ok' => true,
            'user' => public_user($user),
            'stats' => [
                'heroes' => (int) db()->query('SELECT COUNT(*) FROM heroes')->fetchColumn(),
                'movies' => (int) db()->query('SELECT COUNT(*) FROM movies')->fetchColumn(),
                'users' => (int) db()->query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL')->fetchColumn(),
                'posts' => (int) db()->query('SELECT COUNT(*) FROM posts')->fetchColumn(),
                'heroes_growth' => (int) db()->query('SELECT COUNT(*) FROM heroes WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')->fetchColumn(),
                'movies_growth' => (int) db()->query('SELECT COUNT(*) FROM movies WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')->fetchColumn(),
                'users_growth' => (int) db()->query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')->fetchColumn(),
                'posts_growth' => (int) db()->query('SELECT COUNT(*) FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')->fetchColumn(),
            ],
            'notifications' => notifications_for($user),
            'activity' => db()->query('SELECT message, created_at AS createdAt FROM notifications ORDER BY created_at DESC LIMIT 8')->fetchAll(),
        ]);
    }

    if ($action === 'admin/users') {
        current_user(true, 'admin');
        $search = '%' . clean_string($_GET['search'] ?? '') . '%';
        $stmt = db()->prepare(
            'SELECT u.id, u.first_name, u.last_name, u.agent_id, u.email, u.role, u.banned, u.avatar_url, u.created_at,
                    (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS posts_count
             FROM users u
             WHERE u.deleted_at IS NULL AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.agent_id LIKE ? OR u.email LIKE ?)
             ORDER BY u.created_at DESC'
        );
        $stmt->execute([$search, $search, $search, $search]);
        json_response(['ok' => true, 'users' => $stmt->fetchAll()]);
    }

    if ($action === 'admin/users/status') {
        $admin = current_user(true, 'admin');
        require_fields($data, ['id', 'banned']);
        if ((int) $data['id'] === (int) $admin['id']) {
            json_response(['ok' => false, 'message' => 'You cannot ban your own account.'], 422);
        }
        db()->prepare('UPDATE users SET banned = ? WHERE id = ?')->execute([(int) !empty($data['banned']), (int) $data['id']]);
        json_response(['ok' => true]);
    }

    if ($action === 'admin/users/delete') {
        $admin = current_user(true, 'admin');
        require_fields($data, ['id']);
        if ((int) $data['id'] === (int) $admin['id']) {
            json_response(['ok' => false, 'message' => 'Use Settings to delete your own account.'], 422);
        }
        db()->prepare('UPDATE users SET deleted_at = NOW() WHERE id = ?')->execute([(int) $data['id']]);
        json_response(['ok' => true]);
    }

    if ($action === 'admin/heroes') {
        $user = current_user(true, 'admin');
        json_response(['ok' => true, 'heroes' => list_heroes($_GET + $data, $user)]);
    }

    if ($action === 'admin/heroes/delete') {
        current_user(true, 'admin');
        require_fields($data, ['id']);
        $id = (int) $data['id'];

        db()->prepare('DELETE FROM favorites WHERE item_type = "hero" AND item_id = ?')->execute([$id]);
        $stmt = db()->prepare('DELETE FROM heroes WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            json_response(['ok' => false, 'message' => 'Hero not found.'], 404);
        }

        app_add_notification('Hero profile removed by admin: #' . $id, 'all');

        json_response(['ok' => true, 'message' => 'Hero deleted.']);
    }

    if ($action === 'admin/movies') {
        $user = current_user(true, 'admin');
        json_response(['ok' => true, 'movies' => list_movies($_GET + $data, $user)]);
    }

    if ($action === 'admin/movies/delete') {
        current_user(true, 'admin');
        require_fields($data, ['id']);
        $id = (int) $data['id'];

        db()->prepare('DELETE FROM favorites WHERE item_type = "movie" AND item_id = ?')->execute([$id]);
        $stmt = db()->prepare('DELETE FROM movies WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            json_response(['ok' => false, 'message' => 'Movie not found.'], 404);
        }

        app_add_notification('Movie archive item removed by admin: #' . $id, 'all');

        json_response(['ok' => true, 'message' => 'Movie deleted.']);
    }

    if ($action === 'admin/posts') {
        current_user(true, 'admin');
        json_response(['ok' => true, 'posts' => list_posts($_GET + $data, null)]);
    }

    if ($action === 'admin/posts/delete') {
        current_user(true, 'admin');
        require_fields($data, ['id']);
        db()->prepare('DELETE FROM posts WHERE id = ?')->execute([(int) $data['id']]);
        json_response(['ok' => true]);
    }

    if ($action === 'profile/update') {
        $user = current_user(true);
        require_fields($data, ['firstName', 'lastName', 'email']);

        $avatar = upload_image('avatar', 'avatars', $user['avatar_url'] ?: 'assets/images/user-profile/profile-default.png');
        $passwordSql = '';
        $params = [
            clean_string($data['firstName']),
            clean_string($data['lastName']),
            clean_string($data['email']),
            $avatar,
        ];

        if (!empty($data['password'])) {
            if ((string) $data['password'] !== (string) ($data['confirmPassword'] ?? '')) {
                json_response(['ok' => false, 'message' => 'Password confirmation does not match.'], 422);
            }
            $passwordSql = ', password_hash = ?';
            $params[] = password_hash((string) $data['password'], PASSWORD_DEFAULT);
        }

        $params[] = (int) $user['id'];
        $stmt = db()->prepare("UPDATE users SET first_name = ?, last_name = ?, email = ?, avatar_url = ? {$passwordSql} WHERE id = ?");
        $stmt->execute($params);

        json_response(['ok' => true, 'message' => 'Profile updated.']);
    }

    if ($action === 'settings/update') {
        $user = current_user(true);
        json_response(app_update_settings($user, $data));
    }

    if ($action === 'settings/delete-account') {
        $user = current_user(true);
        json_response(app_delete_own_account($user));
    }

    json_response(['ok' => false, 'message' => 'Unknown action.'], 404);
} catch (PDOException $e) {
    json_response([
        'ok' => false,
        'message' => 'Database error. Make sure MySQL is running and import database/schema.sql or open api/install.php.',
        'detail' => $e->getMessage(),
    ], 500);
} catch (Throwable $e) {
    json_response(['ok' => false, 'message' => $e->getMessage()], 500);
}

function list_posts(array $data, ?array $user): array
{
    $search = '%' . clean_string($data['search'] ?? '') . '%';
    $category = clean_string($data['category'] ?? 'All Posts');
    $sort = clean_string($data['sort'] ?? '');
    $params = [$user ? (int) $user['id'] : 0, $search, $search, $search];
    $where = 'WHERE (p.title LIKE ? OR p.body LIKE ? OR u.agent_id LIKE ?)';

    if ($category !== '' && !in_array(strtolower($category), ['all', 'all posts'], true)) {
        $where .= ' AND p.category = ?';
        $params[] = $category;
    }

    $order = strtolower($sort) === 'popular' ? 'likes_count DESC, p.created_at DESC' : 'p.created_at DESC';
    $stmt = db()->prepare(
        "SELECT p.*, u.first_name, u.last_name, u.agent_id, u.avatar_url,
                COUNT(DISTINCT pl.id) AS likes_count,
                COUNT(DISTINCT pc.id) AS comments_count,
                MAX(my_like.id) AS liked_id
         FROM posts p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN post_likes pl ON pl.post_id = p.id
         LEFT JOIN post_comments pc ON pc.post_id = p.id
         LEFT JOIN post_likes my_like ON my_like.post_id = p.id AND my_like.user_id = ?
         {$where}
         GROUP BY p.id
         ORDER BY {$order}"
    );
    $stmt->execute($params);

    return array_map(static function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'author' => trim($row['first_name'] . ' ' . $row['last_name']) ?: $row['agent_id'],
            'agentId' => $row['agent_id'],
            'avatarUrl' => $row['avatar_url'] ?: 'assets/images/user-profile/profile-default.png',
            'title' => $row['title'],
            'body' => $row['body'],
            'category' => $row['category'],
            'likes' => (int) $row['likes_count'],
            'comments' => (int) $row['comments_count'],
            'liked' => $row['liked_id'] !== null,
            'createdAt' => $row['created_at'],
        ];
    }, $stmt->fetchAll());
}
