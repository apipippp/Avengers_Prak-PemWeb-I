<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $dsn = 'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $sql = file_get_contents(__DIR__ . '/../database/schema.sql');
    $pdo->exec($sql);

    echo "Avengers WikiVerse database is ready.\n";
    echo "Admin login: admin@wikiverse.test / admin123\n";
    echo "User login : agent001 / user123\n";
} catch (PDOException $e) {
    http_response_code(500);
    echo "Database setup failed.\n";
    echo "Check api/config.php and make sure MySQL is running.\n";
    echo "Detail: " . $e->getMessage() . "\n";
}
