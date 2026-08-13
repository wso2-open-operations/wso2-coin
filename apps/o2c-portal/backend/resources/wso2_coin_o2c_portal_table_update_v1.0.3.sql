ALTER TABLE conference_event_type MODIFY category enum('SESSION','O2BAR','GENERAL','PARTNER','SYSTEM') NOT NULL;

UPDATE conference_event_type SET category = 'PARTNER' WHERE category = 'SYSTEM';

ALTER TABLE conference_event_type MODIFY category enum('SESSION','O2BAR','GENERAL','PARTNER') NOT NULL;
ALTER TABLE conference_event_type ADD CONSTRAINT `chk_partner_type_match` CHECK (`category` != 'PARTNER' OR `type` = 'PARTNER');

INSERT INTO `conference_event_type` (`type`, `category`, `description`, `default_coins`) VALUES
('PARTNER', 'PARTNER', 'Partner QR Code', 5.00)
ON DUPLICATE KEY UPDATE 
    `category` = VALUES(`category`),
    `description` = VALUES(`description`), 
    `default_coins` = VALUES(`default_coins`);
