CREATE DATABASE IF NOT EXISTS avengers_wikiverse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE avengers_wikiverse;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    agent_id VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    avatar_url VARCHAR(255) NULL,
    banned TINYINT(1) NOT NULL DEFAULT 0,
    mute_notifications TINYINT(1) NOT NULL DEFAULT 0,
    terms_accepted_at DATETIME NULL,
    remember_token_hash CHAR(64) NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS heroes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    real_name VARCHAR(120) NOT NULL,
    team VARCHAR(120) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Avengers',
    powers TEXT NOT NULL,
    power_tags VARCHAR(255) NOT NULL,
    biography TEXT NOT NULL,
    image_url VARCHAR(255) NOT NULL DEFAULT 'assets/images/placeholders/hero.svg',
    power_score TINYINT UNSIGNED NOT NULL DEFAULT 85,
    intelligence_score TINYINT UNSIGNED NOT NULL DEFAULT 85,
    combat_score TINYINT UNSIGNED NOT NULL DEFAULT 85,
    speed_score TINYINT UNSIGNED NOT NULL DEFAULT 75,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_hero_name (name)
);

CREATE TABLE IF NOT EXISTS movies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    phase VARCHAR(40) NOT NULL,
    release_date DATE NOT NULL,
    duration VARCHAR(80) NOT NULL,
    director VARCHAR(160) NOT NULL,
    cast_members TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    poster_url VARCHAR(255) NOT NULL DEFAULT 'assets/images/placeholders/movie.svg',
    rating VARCHAR(20) NOT NULL DEFAULT 'N/A',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_movie_title (title)
);

CREATE TABLE IF NOT EXISTS favorites (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    item_type ENUM('hero', 'movie') NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_favorite (user_id, item_type, item_id),
    CONSTRAINT favorites_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'Discussion',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_post_title (user_id, title),
    CONSTRAINT posts_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_likes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_like (post_id, user_id),
    CONSTRAINT post_likes_post_fk FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT post_likes_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_comments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_comment (post_id, user_id, created_at),
    CONSTRAINT post_comments_post_fk FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT post_comments_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(255) NOT NULL,
    audience ENUM('all', 'user', 'admin') NOT NULL DEFAULT 'all',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_notification_message (message)
);

INSERT INTO
    users (
        first_name,
        last_name,
        agent_id,
        email,
        password_hash,
        role,
        avatar_url,
        terms_accepted_at
    )
VALUES (
        'Admin',
        'Stark',
        'admin',
        'admin@wikiverse.test',
        '$2y$10$wohflirg8g.OC/JfnWiTYOLvmo8TfcsrmDVBZ6Eg3.8IyYi29m7I6',
        'admin',
        'assets/images/user-profile/profile-default.png',
        NOW()
    ),
    (
        'Sean',
        'Arthur',
        'agent001',
        'sean@wikiverse.test',
        '$2y$10$0Ez1fJtUdyIACQ.4uTt/2ekD8kqc2jG5U0kYn6KL9iPrK.ujS3v4G',
        'user',
        'assets/images/user-profile/profile-default.png',
        NOW()
    )
ON DUPLICATE KEY UPDATE
    email = VALUES(email);

INSERT INTO
    heroes (
        name,
        real_name,
        team,
        category,
        powers,
        power_tags,
        biography,
        image_url,
        power_score,
        intelligence_score,
        combat_score,
        speed_score
    )
VALUES (
        'Iron Man',
        'Tony Stark',
        'Avengers',
        'Avengers',
        'Powered armor, flight, advanced weapon systems, tactical analysis.',
        'Tech, Combat, Flight',
        'Tony Stark is a genius inventor who built the Iron Man armor and became a founding Avenger.',
        'assets/images/placeholders/hero.svg',
        95,
        100,
        89,
        80
    ),
    (
        'Thor',
        'Thor Odinson',
        'Avengers',
        'Cosmic',
        'Asgardian strength, lightning control, Mjolnir and Stormbreaker mastery.',
        'Lightning, Strength, Cosmic',
        'Thor is the God of Thunder and a powerful protector across realms.',
        'assets/images/placeholders/hero.svg',
        100,
        78,
        95,
        86
    ),
    (
        'Hulk',
        'Bruce Banner',
        'Avengers',
        'Avengers',
        'Gamma-powered strength, durability, regeneration.',
        'Gamma, Strength, Power',
        'Bruce Banner transforms into Hulk, one of the strongest beings on Earth.',
        'assets/images/placeholders/hero.svg',
        100,
        96,
        84,
        70
    ),
    (
        'Black Widow',
        'Natasha Romanoff',
        'S.H.I.E.L.D.',
        'S.H.I.E.L.D.',
        'Espionage, martial arts, tactical infiltration.',
        'Spy, Combat, Stealth',
        'Natasha Romanoff is an elite agent and founding Avenger known for courage and precision.',
        'assets/images/placeholders/hero.svg',
        72,
        90,
        96,
        83
    ),
    (
        'Captain Marvel',
        'Carol Danvers',
        'Avengers',
        'Cosmic',
        'Cosmic energy projection, flight, superhuman strength.',
        'Cosmic, Flight, Energy',
        'Carol Danvers is a cosmic-powered hero protecting Earth and the galaxy.',
        'assets/images/placeholders/hero.svg',
        100,
        88,
        90,
        95
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name);

INSERT INTO
    movies (
        title,
        phase,
        release_date,
        duration,
        director,
        cast_members,
        synopsis,
        poster_url,
        rating
    )
VALUES (
        'Iron Man',
        'Phase 1',
        '2008-05-02',
        '126 Minutes',
        'Jon Favreau',
        'Robert Downey Jr, Gwyneth Paltrow, Jeff Bridges',
        'After captivity, Tony Stark builds a powered armor suit and becomes Iron Man.',
        'assets/images/placeholders/movie.svg',
        '7.9'
    ),
    (
        'The Avengers',
        'Phase 1',
        '2012-05-04',
        '143 Minutes',
        'Joss Whedon',
        'Robert Downey Jr, Chris Evans, Chris Hemsworth, Scarlett Johansson',
        'Earths mightiest heroes assemble to stop Loki and the Chitauri invasion.',
        'assets/images/placeholders/movie.svg',
        '8.0'
    ),
    (
        'Avengers: Infinity War',
        'Phase 3',
        '2018-04-27',
        '149 Minutes',
        'Anthony Russo, Joe Russo',
        'Robert Downey Jr, Chris Hemsworth, Chris Evans, Josh Brolin',
        'The Avengers and allies must sacrifice everything to stop Thanos from collecting the Infinity Stones.',
        'assets/images/placeholders/movie.svg',
        '8.4'
    ),
    (
        'Avengers: Endgame',
        'Phase 3',
        '2019-04-26',
        '181 Minutes',
        'Anthony Russo, Joe Russo',
        'Robert Downey Jr, Chris Evans, Scarlett Johansson, Mark Ruffalo',
        'After the snap, the surviving Avengers attempt one final mission to restore the universe.',
        'assets/images/placeholders/movie.svg',
        '8.4'
    ),
    (
        'Doctor Strange in the Multiverse of Madness',
        'Phase 4',
        '2022-05-06',
        '126 Minutes',
        'Sam Raimi',
        'Benedict Cumberbatch, Elizabeth Olsen, Xochitl Gomez',
        'Doctor Strange confronts multiverse threats and the consequences of forbidden magic.',
        'assets/images/placeholders/movie.svg',
        '6.9'
    )
ON DUPLICATE KEY UPDATE
    title = VALUES(title);

INSERT INTO
    posts (
        user_id,
        title,
        body,
        category
    )
SELECT u.id, 'Could Kang Return After Secret Wars?', 'Marvel still has several timeline threads that could bring Kang back in a different form.', 'Theory'
FROM users u
WHERE
    u.agent_id = 'agent001'
ON DUPLICATE KEY UPDATE
    title = VALUES(title);

INSERT INTO
    posts (
        user_id,
        title,
        body,
        category
    )
SELECT u.id, 'Best Iron Man Armor?', 'Which suit deserves the top spot: Mark III, Mark L, or Mark LXXXV?', 'Discussion'
FROM users u
WHERE
    u.agent_id = 'agent001'
ON DUPLICATE KEY UPDATE
    title = VALUES(title);

INSERT INTO
    notifications (message, audience)
VALUES (
        'New hero profile added: Captain Marvel',
        'all'
    ),
    (
        'Movie archive updated: Avengers Endgame',
        'all'
    ),
    (
        'Community room is ready for new posts',
        'user'
    ),
    (
        'Review latest community posts',
        'admin'
    )
ON DUPLICATE KEY UPDATE
    message = VALUES(message);