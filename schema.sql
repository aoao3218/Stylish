CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT,
    category ENUM('women','men','accessories') NOT NULL,
    title VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    price INT UNSIGNED NOT NULL,
    texture VARCHAR(50),
    wash VARCHAR(50),
    place VARCHAR(10) NOT NULL,
    note VARCHAR(50),
    story VARCHAR(50),
    PRIMARY KEY (id)
);

CREATE TABLE images (
    product_id INT UNSIGNED NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    image_type VARCHAR(255) NOT NULL,  -- main,other,campaign
    PRIMARY KEY (product_id, image_name, image_type),
    FOREIGN KEY (product_id) REFERENCES products(id)
);



CREATE TABLE variants (
    product_id INT UNSIGNED NOT NULL,
    color_name VARCHAR(25) NOT NULL,
    color_code CHAR(7) NOT NULL,
    size ENUM('XS','S','M','L','XL','2L') NOT NULL,
    stock INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, size,color_code),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT,
    name VARCHAR(25) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password TEXT,
    picture TEXT,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255),
    role VARCHAR(255),
    Unique (email),
    PRIMARY KEY (id)
);

CREATE TABLE campaigns (
    product_id INT UNSIGNED NOT NULL,
    title VARCHAR(50) NOT NULL,
    story VARCHAR(50),
    PRIMARY KEY (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    total VARCHAR(50) NOT NULL,
    recipient JSON NOT NULL,
    status VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_details (
    id INT UNSIGNED AUTO_INCREMENT,
    product_id INT UNSIGNED NOT NULL,
    color_code CHAR(7) NOT NULL,
    size ENUM('XS','S','M','L','XL','2L') NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    price INT UNSIGNED NOT NULL,
    PRIMARY KEY (order_id,product_id, size,color_code),
);



