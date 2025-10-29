/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: c1phpbase
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auto_Testfeed`
--

DROP TABLE IF EXISTS `auto_Testfeed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed` (
  `Testfeed_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `Testfeed_order_num` int(10) unsigned DEFAULT 1,
  `smap_id` int(10) unsigned NOT NULL,
  `test_img` varchar(255) DEFAULT NULL,
  `test_date` datetime DEFAULT NULL,
  `test_datetime` datetime DEFAULT NULL,
  `test_rtf` text DEFAULT NULL,
  `test_text` text DEFAULT NULL,
  PRIMARY KEY (`Testfeed_id`),
  KEY `Testfeed_order_num` (`Testfeed_order_num`),
  KEY `smap_id` (`smap_id`),
  CONSTRAINT `auto_Testfeed_smap_id` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed`
--

LOCK TABLES `auto_Testfeed` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed` DISABLE KEYS */;
INSERT INTO `auto_Testfeed` VALUES
(4,3,3730,'uploads/public/fast-upload/17605464891809.jpg',NULL,NULL,NULL,NULL),
(6,1,3730,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `auto_Testfeed` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_Testfeed_filter`
--

DROP TABLE IF EXISTS `auto_Testfeed_filter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed_filter` (
  `filter_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `filter_pid` int(10) unsigned DEFAULT NULL,
  `filter_order_num` int(10) NOT NULL DEFAULT 1,
  `filter_img` varchar(255) DEFAULT NULL,
  `filter_is_active` tinyint(1) NOT NULL DEFAULT 1,
  `filter_is_feature` tinyint(1) NOT NULL DEFAULT 1,
  `filter_system_name` varchar(255) DEFAULT NULL,
  `filter_is_similar_product` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`filter_id`),
  KEY `filter_pid` (`filter_pid`),
  KEY `filter_order_num` (`filter_order_num`),
  CONSTRAINT `auto_Testfeed_filter_filter_id_pid` FOREIGN KEY (`filter_pid`) REFERENCES `auto_Testfeed_filter` (`filter_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed_filter`
--

LOCK TABLES `auto_Testfeed_filter` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed_filter` DISABLE KEYS */;
INSERT INTO `auto_Testfeed_filter` VALUES
(1,NULL,3,NULL,1,1,NULL,0),
(2,1,2,NULL,1,1,NULL,0);
/*!40000 ALTER TABLE `auto_Testfeed_filter` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_Testfeed_filter_data`
--

DROP TABLE IF EXISTS `auto_Testfeed_filter_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed_filter_data` (
  `fd_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `filter_id` int(10) unsigned NOT NULL,
  `target_id` int(10) unsigned DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`fd_id`),
  KEY `filter_id` (`filter_id`),
  KEY `target_id` (`target_id`),
  CONSTRAINT `auto_Testfeed_filter_data_filter_id_id` FOREIGN KEY (`filter_id`) REFERENCES `auto_Testfeed_filter` (`filter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_Testfeed_filter_data_target_id_id` FOREIGN KEY (`target_id`) REFERENCES `auto_Testfeed` (`Testfeed_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed_filter_data`
--

LOCK TABLES `auto_Testfeed_filter_data` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed_filter_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `auto_Testfeed_filter_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_Testfeed_filter_translation`
--

DROP TABLE IF EXISTS `auto_Testfeed_filter_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed_filter_translation` (
  `filter_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `filter_name` varchar(255) NOT NULL,
  `filter_descr_rtf` text DEFAULT NULL,
  PRIMARY KEY (`filter_id`,`lang_id`),
  KEY `lang_id` (`lang_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed_filter_translation`
--

LOCK TABLES `auto_Testfeed_filter_translation` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed_filter_translation` DISABLE KEYS */;
INSERT INTO `auto_Testfeed_filter_translation` VALUES
(1,1,'123',NULL),
(1,2,'123',NULL),
(1,3,'123',NULL),
(1,4,'123',NULL),
(1,5,'123',NULL),
(1,9,'123',NULL),
(2,1,'123',NULL),
(2,2,'222',NULL),
(2,3,'12312',NULL),
(2,4,'123123',NULL),
(2,5,'123',NULL),
(2,9,'222',NULL);
/*!40000 ALTER TABLE `auto_Testfeed_filter_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_Testfeed_translation`
--

DROP TABLE IF EXISTS `auto_Testfeed_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed_translation` (
  `Testfeed_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `test_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Testfeed_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `auto_Testfeed_translation_0_Testfeed_id` FOREIGN KEY (`Testfeed_id`) REFERENCES `auto_Testfeed` (`Testfeed_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_Testfeed_translation_1_lang_id` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed_translation`
--

LOCK TABLES `auto_Testfeed_translation` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed_translation` DISABLE KEYS */;
INSERT INTO `auto_Testfeed_translation` VALUES
(4,1,NULL),
(4,2,NULL),
(4,3,NULL),
(4,4,NULL),
(4,5,NULL),
(4,9,NULL),
(6,1,NULL),
(6,2,'111'),
(6,3,NULL),
(6,4,NULL),
(6,5,NULL),
(6,9,NULL);
/*!40000 ALTER TABLE `auto_Testfeed_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_Testfeed_uploads`
--

DROP TABLE IF EXISTS `auto_Testfeed_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed_uploads` (
  `au_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `Testfeed_id` int(10) unsigned DEFAULT NULL,
  `upl_id` int(10) unsigned NOT NULL,
  `au_order_num` int(10) unsigned NOT NULL DEFAULT 1,
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`au_id`),
  KEY `Testfeed_id` (`Testfeed_id`),
  KEY `upl_id` (`upl_id`),
  CONSTRAINT `auto_Testfeed_uploads_0_Testfeed_id` FOREIGN KEY (`Testfeed_id`) REFERENCES `auto_Testfeed` (`Testfeed_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_Testfeed_uploads_upl_id` FOREIGN KEY (`upl_id`) REFERENCES `share_uploads` (`upl_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed_uploads`
--

LOCK TABLES `auto_Testfeed_uploads` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed_uploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `auto_Testfeed_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_Testfeed_uploads_translation`
--

DROP TABLE IF EXISTS `auto_Testfeed_uploads_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_Testfeed_uploads_translation` (
  `au_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `file_alt` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`au_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `auto_Testfeed_uploads_translation_au_id` FOREIGN KEY (`au_id`) REFERENCES `auto_Testfeed_uploads` (`au_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_Testfeed_uploads_translation_lang_id` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_Testfeed_uploads_translation`
--

LOCK TABLES `auto_Testfeed_uploads_translation` WRITE;
/*!40000 ALTER TABLE `auto_Testfeed_uploads_translation` DISABLE KEYS */;
/*!40000 ALTER TABLE `auto_Testfeed_uploads_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test`
--

DROP TABLE IF EXISTS `auto_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test` (
  `test_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `test_order_num` int(10) unsigned DEFAULT 1,
  `test_img` varchar(255) DEFAULT NULL,
  `test_date` datetime DEFAULT NULL,
  `test_datetime` datetime DEFAULT NULL,
  `test_rtf` text DEFAULT NULL,
  `test_text` text DEFAULT NULL,
  `u_id` int(10) unsigned DEFAULT NULL,
  `test_multi` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`test_id`),
  KEY `test_order_num` (`test_order_num`),
  KEY `gallery_id` (`u_id`),
  KEY `test_multi` (`test_multi`),
  CONSTRAINT `auto_test_ibfk_1` FOREIGN KEY (`u_id`) REFERENCES `user_users` (`u_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_test_ibfk_2` FOREIGN KEY (`test_multi`) REFERENCES `auto_test_category_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test`
--

LOCK TABLES `auto_test` WRITE;
/*!40000 ALTER TABLE `auto_test` DISABLE KEYS */;
INSERT INTO `auto_test` VALUES
(1,7,NULL,'2025-06-20 00:49:00','2024-11-21 03:16:00','<p>asd</p>\n',NULL,NULL,NULL),
(4,3,NULL,NULL,NULL,'<p>1111</p>\n','test12',NULL,NULL),
(5,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(6,5,NULL,NULL,NULL,'<p>111aaa</p>\n',NULL,NULL,NULL),
(7,3,'uploads/public/gallery/17607781644989.png',NULL,NULL,'<p>123456</p>\n',NULL,1658,NULL),
(8,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `auto_test` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_category`
--

DROP TABLE IF EXISTS `auto_test_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_category` (
  `category_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_category`
--

LOCK TABLES `auto_test_category` WRITE;
/*!40000 ALTER TABLE `auto_test_category` DISABLE KEYS */;
INSERT INTO `auto_test_category` VALUES
(1,'test 1'),
(2,'test 2'),
(5,'test 3'),
(7,'тест 4');
/*!40000 ALTER TABLE `auto_test_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_category_test`
--

DROP TABLE IF EXISTS `auto_test_category_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_category_test` (
  `test_id` int(10) unsigned NOT NULL,
  `article_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`test_id`,`article_id`),
  KEY `article_id` (`article_id`),
  CONSTRAINT `auto_test_category_test_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `auto_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_test_category_test_ibfk_2` FOREIGN KEY (`article_id`) REFERENCES `auto_test_category` (`category_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_category_test`
--

LOCK TABLES `auto_test_category_test` WRITE;
/*!40000 ALTER TABLE `auto_test_category_test` DISABLE KEYS */;
INSERT INTO `auto_test_category_test` VALUES
(7,1),
(7,5),
(7,7),
(8,1);
/*!40000 ALTER TABLE `auto_test_category_test` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_filter`
--

DROP TABLE IF EXISTS `auto_test_filter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_filter` (
  `filter_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `filter_pid` int(10) unsigned DEFAULT NULL,
  `filter_order_num` int(10) NOT NULL DEFAULT 1,
  `filter_img` varchar(255) DEFAULT NULL,
  `filter_is_active` tinyint(1) NOT NULL DEFAULT 1,
  `filter_is_feature` tinyint(1) NOT NULL DEFAULT 1,
  `filter_system_name` varchar(255) DEFAULT NULL,
  `filter_is_similar_product` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`filter_id`),
  KEY `filter_pid` (`filter_pid`),
  KEY `filter_order_num` (`filter_order_num`),
  CONSTRAINT `auto_test_filter_filter_id_pid` FOREIGN KEY (`filter_pid`) REFERENCES `auto_test_filter` (`filter_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_filter`
--

LOCK TABLES `auto_test_filter` WRITE;
/*!40000 ALTER TABLE `auto_test_filter` DISABLE KEYS */;
INSERT INTO `auto_test_filter` VALUES
(1,NULL,3,NULL,0,0,NULL,0),
(2,1,2,NULL,0,0,NULL,0),
(3,2,2,NULL,1,1,NULL,0);
/*!40000 ALTER TABLE `auto_test_filter` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_filter_data`
--

DROP TABLE IF EXISTS `auto_test_filter_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_filter_data` (
  `fd_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `filter_id` int(10) unsigned NOT NULL,
  `target_id` int(10) unsigned DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`fd_id`),
  KEY `filter_id` (`filter_id`),
  KEY `target_id` (`target_id`),
  CONSTRAINT `auto_test_filter_data_filter_id_id` FOREIGN KEY (`filter_id`) REFERENCES `auto_test_filter` (`filter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_test_filter_data_target_id_id` FOREIGN KEY (`target_id`) REFERENCES `auto_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_filter_data`
--

LOCK TABLES `auto_test_filter_data` WRITE;
/*!40000 ALTER TABLE `auto_test_filter_data` DISABLE KEYS */;
INSERT INTO `auto_test_filter_data` VALUES
(2,1,1,NULL),
(3,2,1,NULL),
(6,1,4,NULL);
/*!40000 ALTER TABLE `auto_test_filter_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_filter_translation`
--

DROP TABLE IF EXISTS `auto_test_filter_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_filter_translation` (
  `filter_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `filter_name` varchar(255) NOT NULL,
  `filter_descr_rtf` text DEFAULT NULL,
  PRIMARY KEY (`filter_id`,`lang_id`),
  KEY `lang_id` (`lang_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_filter_translation`
--

LOCK TABLES `auto_test_filter_translation` WRITE;
/*!40000 ALTER TABLE `auto_test_filter_translation` DISABLE KEYS */;
INSERT INTO `auto_test_filter_translation` VALUES
(1,1,'test',NULL),
(1,2,'Test',NULL),
(1,3,'Test',NULL),
(1,4,'Prüfen',NULL),
(1,5,'Test',NULL),
(1,9,'Test',NULL),
(2,1,'testr',NULL),
(2,2,'testu',NULL),
(2,3,'teste',NULL),
(2,4,'testd',NULL),
(2,5,'testp',NULL),
(2,9,'testu',NULL),
(3,1,'test',NULL),
(3,2,'test',NULL),
(3,3,'test',NULL),
(3,4,'test',NULL),
(3,5,'test',NULL),
(3,9,'test',NULL);
/*!40000 ALTER TABLE `auto_test_filter_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_translation`
--

DROP TABLE IF EXISTS `auto_test_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_translation` (
  `test_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `test_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`test_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `auto_test_translation_0_test_id` FOREIGN KEY (`test_id`) REFERENCES `auto_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_test_translation_1_lang_id` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_translation`
--

LOCK TABLES `auto_test_translation` WRITE;
/*!40000 ALTER TABLE `auto_test_translation` DISABLE KEYS */;
INSERT INTO `auto_test_translation` VALUES
(1,1,NULL),
(1,2,'ua'),
(1,3,NULL),
(1,4,'de'),
(1,5,'poland111'),
(1,9,'ua'),
(4,1,NULL),
(4,2,'ua'),
(4,3,NULL),
(4,4,'de'),
(4,5,NULL),
(4,9,'ua'),
(5,1,NULL),
(5,2,NULL),
(5,3,NULL),
(5,4,NULL),
(5,5,NULL),
(5,9,NULL),
(6,1,'r'),
(6,2,'u'),
(6,3,'e'),
(6,4,'d'),
(6,5,'p1'),
(6,9,'u'),
(7,1,NULL),
(7,2,'uaa'),
(7,3,NULL),
(7,4,NULL),
(7,5,'poland'),
(7,9,'ua'),
(8,1,NULL),
(8,2,NULL),
(8,3,NULL),
(8,4,NULL),
(8,5,NULL),
(8,9,NULL);
/*!40000 ALTER TABLE `auto_test_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_uploads`
--

DROP TABLE IF EXISTS `auto_test_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_uploads` (
  `au_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `test_id` int(10) unsigned DEFAULT NULL,
  `upl_id` int(10) unsigned NOT NULL,
  `au_order_num` int(10) unsigned NOT NULL DEFAULT 1,
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`au_id`),
  KEY `test_id` (`test_id`),
  KEY `upl_id` (`upl_id`),
  CONSTRAINT `auto_test_uploads_0_test_id` FOREIGN KEY (`test_id`) REFERENCES `auto_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_test_uploads_upl_id` FOREIGN KEY (`upl_id`) REFERENCES `share_uploads` (`upl_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_uploads`
--

LOCK TABLES `auto_test_uploads` WRITE;
/*!40000 ALTER TABLE `auto_test_uploads` DISABLE KEYS */;
INSERT INTO `auto_test_uploads` VALUES
(77,7,32072,32072,'6c0f29096a5d446d2acee6f1bca6e877');
/*!40000 ALTER TABLE `auto_test_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auto_test_uploads_translation`
--

DROP TABLE IF EXISTS `auto_test_uploads_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_test_uploads_translation` (
  `au_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `file_alt` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`au_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `auto_test_uploads_translation_au_id` FOREIGN KEY (`au_id`) REFERENCES `auto_test_uploads` (`au_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `auto_test_uploads_translation_lang_id` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_test_uploads_translation`
--

LOCK TABLES `auto_test_uploads_translation` WRITE;
/*!40000 ALTER TABLE `auto_test_uploads_translation` DISABLE KEYS */;
INSERT INTO `auto_test_uploads_translation` VALUES
(77,1,NULL),
(77,2,NULL),
(77,3,NULL),
(77,4,NULL),
(77,5,NULL),
(77,9,NULL);
/*!40000 ALTER TABLE `auto_test_uploads_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_access_level`
--

DROP TABLE IF EXISTS `share_access_level`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_access_level` (
  `smap_id` int(10) unsigned NOT NULL,
  `group_id` int(10) unsigned NOT NULL,
  `right_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`smap_id`,`group_id`,`right_id`),
  KEY `group_id` (`group_id`),
  KEY `right_id` (`right_id`),
  CONSTRAINT `share_access_level_ibfk_4` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_access_level_ibfk_5` FOREIGN KEY (`group_id`) REFERENCES `user_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_access_level_ibfk_6` FOREIGN KEY (`right_id`) REFERENCES `user_group_rights` (`right_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_access_level`
--

LOCK TABLES `share_access_level` WRITE;
/*!40000 ALTER TABLE `share_access_level` DISABLE KEYS */;
INSERT INTO `share_access_level` VALUES
(80,1,3),
(80,3,1),
(80,4,1),
(330,1,3),
(330,3,1),
(330,4,1),
(3625,1,3),
(3625,3,1),
(3625,4,1),
(3675,1,3),
(3675,4,1),
(3725,1,3),
(3727,1,3),
(3727,3,2),
(3727,4,1),
(3728,1,3),
(3728,4,1),
(3729,1,3),
(3729,4,1),
(3730,1,3),
(3730,3,2),
(3730,4,1),
(3732,1,3),
(3732,3,2),
(3732,4,1),
(3733,1,3),
(3733,3,2),
(3733,4,1),
(3734,1,3),
(3734,3,2),
(3734,4,1),
(3737,1,3),
(3737,3,2),
(3737,4,1),
(3741,1,3),
(3741,3,2),
(3741,4,1);
/*!40000 ALTER TABLE `share_access_level` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_domain2site`
--

DROP TABLE IF EXISTS `share_domain2site`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_domain2site` (
  `domain_id` int(10) unsigned NOT NULL,
  `site_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`domain_id`,`site_id`),
  KEY `site_id` (`site_id`),
  CONSTRAINT `share_domain2site_ibfk_1` FOREIGN KEY (`domain_id`) REFERENCES `share_domains` (`domain_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_domain2site_ibfk_2` FOREIGN KEY (`site_id`) REFERENCES `share_sites` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_domain2site`
--

LOCK TABLES `share_domain2site` WRITE;
/*!40000 ALTER TABLE `share_domain2site` DISABLE KEYS */;
INSERT INTO `share_domain2site` VALUES
(1,1);
/*!40000 ALTER TABLE `share_domain2site` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_domains`
--

DROP TABLE IF EXISTS `share_domains`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_domains` (
  `domain_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `domain_protocol` char(5) NOT NULL DEFAULT 'http',
  `domain_port` mediumint(8) unsigned NOT NULL DEFAULT 80,
  `domain_host` varchar(255) NOT NULL,
  `domain_root` varchar(255) NOT NULL,
  PRIMARY KEY (`domain_id`),
  UNIQUE KEY `domain_protocol` (`domain_protocol`,`domain_host`,`domain_port`,`domain_root`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_domains`
--

LOCK TABLES `share_domains` WRITE;
/*!40000 ALTER TABLE `share_domains` DISABLE KEYS */;
INSERT INTO `share_domains` VALUES
(1,'https',80,'phpbase.kweb.ua','/');
/*!40000 ALTER TABLE `share_domains` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_lang_tags`
--

DROP TABLE IF EXISTS `share_lang_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_lang_tags` (
  `ltag_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ltag_name` varchar(70) NOT NULL,
  PRIMARY KEY (`ltag_id`),
  UNIQUE KEY `ltag_name` (`ltag_name`)
) ENGINE=InnoDB AUTO_INCREMENT=1112484 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_lang_tags`
--

LOCK TABLES `share_lang_tags` WRITE;
/*!40000 ALTER TABLE `share_lang_tags` DISABLE KEYS */;
INSERT INTO `share_lang_tags` VALUES
(493,'BTN_ACTIVATE'),
(43,'BTN_ADD'),
(1288,'BTN_ADD_ARTICLE'),
(313,'BTN_ADD_DIR'),
(464,'BTN_ALIGN_CENTER'),
(465,'BTN_ALIGN_JUSTIFY'),
(462,'BTN_ALIGN_LEFT'),
(463,'BTN_ALIGN_RIGHT'),
(1208,'BTN_APPLY'),
(327,'BTN_APPLY_FILTER'),
(1112473,'BTN_AUTH'),
(457,'BTN_BOLD'),
(347,'BTN_CANCEL'),
(55,'BTN_CHANGE'),
(134,'BTN_CLOSE'),
(47,'BTN_DELETE'),
(1287,'BTN_DELETE_ARTICLE'),
(546,'BTN_DOWN'),
(46,'BTN_EDIT'),
(1289,'BTN_EDIT_ARTICLE'),
(1135,'BTN_EDIT_BLOCKS'),
(56,'BTN_EDIT_MODE'),
(1197,'BTN_EDIT_NEXT'),
(1198,'BTN_EDIT_PREV'),
(1207,'BTN_EXT_FLASH'),
(466,'BTN_FILE_LIBRARY'),
(357,'BTN_FILE_REPOSITORY'),
(214,'BTN_GO'),
(459,'BTN_HREF'),
(169,'BTN_IMAGELIB'),
(168,'BTN_INSERT'),
(161,'BTN_INSERT_IMAGE'),
(458,'BTN_ITALIC'),
(489,'BTN_LANG_EDITOR'),
(1986,'BTN_MOVE'),
(251,'BTN_MOVE_DOWN'),
(250,'BTN_MOVE_UP'),
(461,'BTN_OL'),
(312,'BTN_OPEN'),
(542,'BTN_PRINT'),
(1112476,'BTN_PROPERTIES'),
(2037,'BTN_PUBLISH'),
(2026,'BTN_QUICK_UPLOAD'),
(2284,'BTN_REFRESH'),
(1105,'BTN_RESET_TEMPLATES'),
(45,'BTN_RETURN_LIST'),
(491,'BTN_ROLE_EDITOR'),
(42,'BTN_SAVE'),
(237,'BTN_SELECT'),
(1430,'BTN_SIDEBAR'),
(1134,'BTN_SITE_EDITOR'),
(381,'BTN_TRANS_EDITOR'),
(460,'BTN_UL'),
(2038,'BTN_UNPUBLISH'),
(545,'BTN_UP'),
(346,'BTN_UPDATE'),
(1346,'BTN_UPLOAD'),
(490,'BTN_USER_EDITOR'),
(157,'BTN_VIEW'),
(61,'BTN_VIEWSOURCE'),
(469,'BTN_ZIP_UPLOAD'),
(170,'ERR_403'),
(96,'ERR_404'),
(376,'ERR_BAD_LOGIN'),
(468,'ERR_BAD_URL'),
(65,'ERR_CANT_DELETE_YOURSELF'),
(383,'ERR_CANT_MOVE'),
(263,'ERR_DATABASE_ERROR'),
(339,'ERR_DEFAULT_GROUP'),
(389,'ERR_DEV_NO_DATA'),
(303,'ERR_NOT_UNIQUE_DATA'),
(544,'ERR_NO_DIV_NAME'),
(295,'ERR_NO_U_NAME'),
(952,'ERR_PWD_MISMATCH'),
(2042,'ERR_UPL_NOT_READY'),
(372,'FIELD_CHANGE_U_PASSWORD'),
(373,'FIELD_CHANGE_U_PASSWORD2'),
(1081,'FIELD_ID'),
(172,'FIELD_IMG_ALIGN'),
(167,'FIELD_IMG_ALTTEXT'),
(162,'FIELD_IMG_FILENAME'),
(158,'FIELD_IMG_FILENAME_IMG'),
(164,'FIELD_IMG_HEIGHT'),
(500,'FIELD_IMG_MARGIN_BOTTOM'),
(501,'FIELD_IMG_MARGIN_LEFT'),
(502,'FIELD_IMG_MARGIN_RIGHT'),
(503,'FIELD_IMG_MARGIN_TOP'),
(163,'FIELD_IMG_WIDTH'),
(2051,'FIELD_NAME'),
(1169,'FIELD_TYPE_BOOL'),
(1172,'FIELD_TYPE_DATE'),
(1173,'FIELD_TYPE_DATETIME'),
(2014,'FIELD_TYPE_EMAIL'),
(1174,'FIELD_TYPE_FILE'),
(1178,'FIELD_TYPE_INFO'),
(1179,'FIELD_TYPE_MULTI'),
(2015,'FIELD_TYPE_PHONE'),
(1171,'FIELD_TYPE_SELECT'),
(1168,'FIELD_TYPE_STRING'),
(1170,'FIELD_TYPE_TEXT'),
(1344,'FIELD_UPL_FILE_PATH'),
(2046,'FIELD_UPL_IS_READY'),
(1358,'FIELD_UPL_PATH2'),
(506,'FIELD_U_GROUP'),
(53,'FIELD_U_PASSWORD2'),
(144,'MSG_BAD_EMAIL_FORMAT'),
(146,'MSG_BAD_FLOAT_FORMAT'),
(145,'MSG_BAD_PHONE_FORMAT'),
(154,'MSG_CONFIRM_DELETE'),
(1152,'MSG_CONFIRM_TEMPLATES_RESET'),
(1259,'MSG_EMPTY_RECORDSET'),
(136,'MSG_FIELD_IS_NOT_NULL'),
(783,'MSG_FILE_IS_NOT_NULL'),
(2505,'MSG_PASSWORD_SHORT'),
(374,'MSG_PWD_MISMATCH'),
(1153,'MSG_TEMPLATES_RESET'),
(445,'TAB_ATTACHED_FILES'),
(1351,'TAB_DOMAINS'),
(1112480,'TAB_FILTERS'),
(510,'TAB_PAGE_RIGHTS'),
(1213,'TXT_ACTION_SELECTOR'),
(456,'TXT_ADDRESS'),
(508,'TXT_AFTER_SAVE_ACTION'),
(173,'TXT_ALIGN_BOTTOM'),
(176,'TXT_ALIGN_LEFT'),
(174,'TXT_ALIGN_MIDDLE'),
(177,'TXT_ALIGN_RIGHT'),
(175,'TXT_ALIGN_TOP'),
(1142,'TXT_ALL_NEWS'),
(1112483,'TXT_ARE_YOU_SURE_SAVE'),
(429,'TXT_BACK_TO_LIST'),
(302,'TXT_BAD_SEGMENT_FORMAT'),
(1286,'TXT_BODY_REGISTER'),
(2472,'TXT_CANCEL'),
(1093,'TXT_CHANGED'),
(1574,'TXT_CLEAR'),
(1112431,'TXT_CLOSE'),
(1212,'TXT_CONTENT'),
(1112470,'TXT_COPYRIGHT'),
(507,'TXT_DIVISIONS'),
(238,'TXT_DIVISION_EDITOR'),
(1112460,'TXT_EMAIL'),
(1942,'TXT_ERR_EMAIL_EXISTS'),
(1112481,'TXT_FEATURES'),
(326,'TXT_FILTER'),
(1149,'TXT_FILTER_SIGN_BETWEEN'),
(1147,'TXT_FILTER_SIGN_CONTAINS'),
(1148,'TXT_FILTER_SIGN_NOT_CONTAINS'),
(1112462,'TXT_FORGOT_PASSWORD'),
(739,'TXT_FROM'),
(450,'TXT_H1'),
(451,'TXT_H2'),
(452,'TXT_H3'),
(453,'TXT_H4'),
(454,'TXT_H5'),
(455,'TXT_H6'),
(344,'TXT_HOME'),
(2043,'TXT_IMG_MANAGER'),
(279,'TXT_LANGUAGE_EDITOR'),
(1211,'TXT_LAYOUT'),
(1112479,'TXT_LOGIN_SUCCESS'),
(1456,'TXT_LOGOUT'),
(1112464,'TXT_LOGOUT_TEXT'),
(471,'TXT_MONTH_1'),
(2040,'TXT_NOT_READY'),
(156,'TXT_NO_RIGHTS'),
(216,'TXT_PAGES'),
(1112461,'TXT_PASSWORD'),
(385,'TXT_PREVIEW'),
(1458,'TXT_PROFILE'),
(1112468,'TXT_PROFILE_CHANGE_EMAIL'),
(1112466,'TXT_PROFILE_CHANGE_MY_DATA'),
(1112467,'TXT_PROFILE_CHANGE_PASSWORD'),
(81,'TXT_PROPERTIES'),
(752,'TXT_READ_MORE'),
(1112478,'TXT_RECOVERY_COMPLETED'),
(1112477,'TXT_RECOVERY_EMAIL_BODY'),
(1112475,'TXT_RECOVER_MESSAGE_SUCCESS'),
(1112474,'TXT_RECOVER_PASSWORD'),
(690,'TXT_REGISTRATION_TEXT'),
(439,'TXT_REQUIRED_FIELDS'),
(449,'TXT_RESET'),
(1089,'TXT_RESET_CONTENT'),
(328,'TXT_RESET_FILTER'),
(341,'TXT_ROLE_DIV_RIGHTS'),
(274,'TXT_ROLE_EDITOR'),
(488,'TXT_ROLE_TEXT'),
(1112469,'TXT_SAVED'),
(1214,'TXT_SAVE_CONTENT'),
(1216,'TXT_SAVE_TO_CURRENT_CONTENT'),
(1215,'TXT_SAVE_TO_NEW_CONTENT'),
(143,'TXT_SHIT_HAPPENS'),
(1112459,'TXT_SIGN_UP'),
(1112472,'TXT_SIGN_WITH'),
(504,'TXT_SUBJ_REGISTER'),
(293,'TXT_SUBJ_RESTORE_PASSWORD'),
(322,'TXT_THUMBS'),
(740,'TXT_TO'),
(726,'TXT_TODAY'),
(1228,'TXT_TOTAL'),
(273,'TXT_USER_EDITOR'),
(287,'TXT_USER_GREETING'),
(304,'TXT_USER_GROUPS'),
(286,'TXT_USER_NAME'),
(2048,'TXT_USER_PROFILE'),
(441,'TXT_USER_REGISTRED');
/*!40000 ALTER TABLE `share_lang_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_lang_tags_translation`
--

DROP TABLE IF EXISTS `share_lang_tags_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_lang_tags_translation` (
  `ltag_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `ltag_value_rtf` text NOT NULL,
  PRIMARY KEY (`ltag_id`,`lang_id`),
  KEY `FK_tranaslatelv_language` (`lang_id`),
  CONSTRAINT `FK_Reference_6` FOREIGN KEY (`ltag_id`) REFERENCES `share_lang_tags` (`ltag_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_tranaslatelv_language` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_lang_tags_translation`
--

LOCK TABLES `share_lang_tags_translation` WRITE;
/*!40000 ALTER TABLE `share_lang_tags_translation` DISABLE KEYS */;
INSERT INTO `share_lang_tags_translation` VALUES
(42,1,'Сохранить'),
(42,2,'Зберегти'),
(42,3,'Save'),
(42,4,'Speichern'),
(42,5,'Zapisz'),
(42,9,'Зберегти'),
(43,1,'Добавить'),
(43,2,'Додати'),
(43,3,'Add'),
(43,4,'Hinzufügen'),
(43,5,'Dodaj'),
(43,9,'Додати'),
(45,1,'вернуться к списку'),
(45,2,'повернутися до списку'),
(45,3,'Return to list'),
(45,4,'Zurück zur Liste'),
(45,5,'Powrót do listy'),
(45,9,'повернутися до списку'),
(46,1,'Редактировать'),
(46,2,'Редагувати'),
(46,3,'Edit'),
(46,4,'Bearbeiten'),
(46,5,'Edytuj'),
(46,9,'Редагувати'),
(47,1,'Удалить'),
(47,2,'Видалити'),
(47,3,'Delete'),
(47,4,'Löschen'),
(47,5,'Usuń'),
(47,9,'Видалити'),
(53,1,'Повторите пароль'),
(53,2,'Повторіть пароль'),
(53,3,'Repeat password'),
(53,4,'Passwort wiederholen'),
(53,5,'Powtórz hasło'),
(53,9,'Повторіть пароль'),
(55,1,'Сохранить изменения'),
(55,2,'Зберегти зміни'),
(55,3,'Save changes'),
(55,4,'Änderungen speichern'),
(55,5,'Zapisz zmiany'),
(55,9,'Зберегти зміни'),
(56,1,'Режим редактирования'),
(56,2,'Режим редагування'),
(56,3,'Edit mode'),
(56,4,'Bearbeitungsmodus'),
(56,5,'Tryb edycji'),
(56,9,'Режим редагування'),
(61,1,'Исходный код'),
(61,2,'Вихідний код'),
(61,3,'Source code'),
(61,4,'Quellcode'),
(61,5,'Kod źródłowy'),
(61,9,'Вихідний код'),
(65,1,'Невозможно удалить себя самого.'),
(65,2,'Неможливо видалити самого себе.'),
(65,3,'It is impossible to delete yourself'),
(65,4,'Es ist unmöglich, sich selbst zu löschen.'),
(65,5,'Nie można usunąć siebie.'),
(65,9,'Неможливо видалити самого себе.'),
(81,1,'Свойства'),
(81,2,'Властивості'),
(81,3,'Properties'),
(81,4,'Eigenschaften'),
(81,5,'Właściwości'),
(81,9,'Властивості'),
(96,1,'Ошибка 404: документ не найден.'),
(96,2,'Помилка 404: документ не знайдено.'),
(96,3,'Mistake 404: the document was not found'),
(96,4,'Fehler 404: Das Dokument wurde nicht gefunden.'),
(96,5,'Błąd 404: dokument nie został znaleziony'),
(96,9,'Помилка 404: документ не знайдено.'),
(134,1,'Закрыть'),
(134,2,'Закрити'),
(134,3,'Close'),
(134,4,'Schließen'),
(134,5,'Zamknij'),
(134,9,'Закрити'),
(136,1,'Поле не может быть пустым.'),
(136,2,'Поле не може бути порожнім.'),
(136,3,'The field cannot be left blank'),
(136,4,'Das Feld darf nicht leer gelassen werden.'),
(136,5,'Pole nie może być pusty.'),
(136,9,'Поле не може бути порожнім.'),
(143,1,'При сохранении произошли ошибки'),
(143,2,'При збереженні сталися помилки'),
(143,3,'Errors occurred while saving'),
(143,4,'Fehler sind beim Speichern aufgetreten.'),
(143,5,'Wystąpiły błędy podczas zapisywania'),
(143,9,'При збереженні сталися помилки'),
(144,1,'Неправильный формат e-mail.'),
(144,2,'Неправильний формат e-mail.'),
(144,3,'Wrong email format'),
(144,4,'Falsches E-Mail-Format'),
(144,5,'Zły format adresu e-mail'),
(144,9,'Неправильний формат e-mail.'),
(145,1,'Неправильный формат телефонного номера. Он должен содержать только цифры, знак \"-\", или пробел.'),
(145,2,'Неправильний формат телефонного номера. Він повинен містити тільки цифри, знак \"-\", або пробіл.'),
(145,3,'Wrong telephone number format. It should only contain numbers, \'-\' symbol, or a space'),
(145,4,'Falsches Telefonformat. Es sollte nur Zahlen, das Zeichen \'-\' oder ein Leerzeichen enthalten.'),
(145,5,'Nieprawidłowy format numeru telefonu. Powinien zawierać tylko cyfry, symbol \'-\' lub spację.'),
(145,9,'Неправильний формат телефонного номера. Він повинен містити тільки цифри, знак \"-\", або пробіл.'),
(146,1,'Неправильный формат числа.'),
(146,2,'Неправильний формат числа.'),
(146,3,'Wrong number format'),
(146,4,'Falsches Zahlenformat'),
(146,5,'Nieprawidłowy format numeru'),
(146,9,'Неправильний формат числа.'),
(154,1,'Вы уверены, что хотите удалить запись? Восстановить данные потом будет невозможно.'),
(154,2,'Ви впевнені, що хочете видалити запис? Відновити дані потім буде неможливо.'),
(154,3,'Are you sure you want to delete the post? Restoring this data would then be impossible.'),
(154,4,'Bist du sicher, dass du den Beitrag löschen möchtest? Eine Wiederherstellung dieser Daten wäre dann unmöglich.'),
(154,5,'Czy na pewno chcesz usunąć ten post? Przywrócenie tych danych będzie wtedy niemożliwe.'),
(154,9,'Ви впевнені, що хочете видалити запис? Відновити дані потім буде неможливо.'),
(156,1,'Права отсутствуют'),
(156,2,'Права відсутні'),
(156,3,'Access is not allowed'),
(156,4,'Zugang ist nicht erlaubt.'),
(156,5,'Dostęp jest zabroniony'),
(156,9,'Права відсутні'),
(157,1,'Просмотреть'),
(157,2,'Продивитись'),
(157,3,'View'),
(157,4,'Ansicht'),
(157,5,'Widok'),
(157,9,'Продивитись'),
(158,1,'Изображение'),
(158,2,'Зображення'),
(158,3,'Image'),
(158,4,'Bild'),
(158,5,'Obraz'),
(158,9,'Зображення'),
(161,1,'Вставить изображение'),
(161,2,'Вставити зображення'),
(161,3,'Insert image'),
(161,4,'Bild einfügen'),
(161,5,'Wstaw obrazek'),
(161,9,'Вставити зображення'),
(162,1,'Имя файла'),
(162,2,'Назва файла'),
(162,3,'File name'),
(162,4,'Dateiname'),
(162,5,'Nazwa pliku'),
(162,9,'Назва файла'),
(163,1,'Ширина'),
(163,2,'Ширина'),
(163,3,'Width'),
(163,4,'Breite'),
(163,5,'Szerokość'),
(163,9,'Ширина'),
(164,1,'Высота'),
(164,2,'Висота'),
(164,3,'Height'),
(164,4,'Höhe'),
(164,5,'Wysokość'),
(164,9,'Висота'),
(167,1,'Альтернативный текст'),
(167,2,'Альтернативний текст'),
(167,3,'Alternative text'),
(167,4,'Alternativtext'),
(167,5,'Tekst alternatywny'),
(167,9,'Альтернативний текст'),
(168,1,'Вставить изображение'),
(168,2,'Вставити зображення'),
(168,3,'Insert image'),
(168,4,'Bild einfügen'),
(168,5,'Wstaw obrazek'),
(168,9,'Вставити зображення'),
(169,1,'Библиотека изображений'),
(169,2,'Бібліотека зображень'),
(169,3,'Image library'),
(169,4,'Bildbibliothek'),
(169,5,'Biblioteka obrazów'),
(169,9,'Бібліотека зображень'),
(170,1,'У Вас недостаточно прав на просмотр этой страницы.'),
(170,2,'У Вас недостатньо прав для перегляду цієї сторінки.'),
(170,3,'You are not authorized to view this page'),
(170,4,'Sie sind nicht berechtigt, diese Seite anzuzeigen.'),
(170,5,'Nie masz uprawnień do wyświetlenia tej strony.'),
(170,9,'У Вас недостатньо прав для перегляду цієї сторінки.'),
(172,1,'Выравнивание'),
(172,2,'Вирівнювання'),
(172,3,'Alignment'),
(172,4,'Ausrichtung'),
(172,5,'Wyrównanie'),
(172,9,'Вирівнювання'),
(173,1,'Внизу'),
(173,2,'Внизу'),
(173,3,'Below'),
(173,4,'Unten'),
(173,5,'Poniżej'),
(173,9,'Внизу'),
(174,1,'Посередине'),
(174,2,'Посередині'),
(174,3,'In the middle'),
(174,4,'In der Mitte'),
(174,5,'W środku'),
(174,9,'Посередині'),
(175,1,'Вверху'),
(175,2,'Зверху'),
(175,3,'Top'),
(175,4,'Oberseite'),
(175,5,'Szczyt'),
(175,9,'Зверху'),
(176,1,'Слева'),
(176,2,'Зліва'),
(176,3,'Left'),
(176,4,'Links'),
(176,5,'Lewo'),
(176,9,'Зліва'),
(177,1,'Справа'),
(177,2,'Справа'),
(177,3,'Right'),
(177,4,'Recht'),
(177,5,'Prawo'),
(177,9,'Справа'),
(214,1,'Перейти'),
(214,2,'Перейти'),
(214,3,'Go to'),
(214,4,'Gehe zu'),
(214,5,'Idź do'),
(214,9,'Перейти'),
(216,1,'Страницы'),
(216,2,'Сторінки'),
(216,3,'Pages'),
(216,4,'Seiten'),
(216,5,'Strony'),
(216,9,'Сторінки'),
(237,1,'Выбрать'),
(237,2,'Обрати'),
(237,3,'Select'),
(237,4,'Auswählen'),
(237,5,'Wybierz'),
(237,9,'Обрати'),
(238,1,'Список разделов'),
(238,2,'Список розділів'),
(238,3,'Sections list'),
(238,4,'Abschnittsverzeichnis'),
(238,5,'Lista sekcji'),
(238,9,'Список розділів'),
(250,1,'Поднять'),
(250,2,'Підняти'),
(250,3,'Move up'),
(250,4,'Bewege nach oben'),
(250,5,'Przenieś się w górę'),
(250,9,'Підняти'),
(251,1,'Опустить'),
(251,2,'Опустити'),
(251,3,'Move down'),
(251,4,'Nach unten bewegen'),
(251,5,'Przesuń w dół'),
(251,9,'Опустити'),
(263,1,'Произошла ошибка при работе с базой данных.'),
(263,2,'Сталася помилка при роботі з базою даних.'),
(263,3,'Database error'),
(263,4,'Datenbankfehler'),
(263,5,'Błąd bazy danych'),
(263,9,'Сталася помилка при роботі з базою даних.'),
(273,1,'Редактор пользователей'),
(273,2,'Редактор користувачів'),
(273,3,'User editor'),
(273,4,'Benutzereditor'),
(273,5,'Użytkownik edytor'),
(273,9,'Редактор користувачів'),
(274,1,'Редактор ролей'),
(274,2,'Редактор ролей'),
(274,3,'Role editor'),
(274,4,'Rollenredakteur'),
(274,5,'Rola edytora'),
(274,9,'Редактор ролей'),
(279,1,'Редактор языков'),
(279,2,'Редактор мов'),
(279,3,'Language editor'),
(279,4,'Sprachredakteur'),
(279,5,'Redaktor językowy'),
(279,9,'Редактор мов'),
(286,1,'Вы вошли в систему как'),
(286,2,'Ви увійшли до системи як'),
(286,3,'You entered the system as'),
(286,4,'Sie haben das System als eingegeben'),
(286,5,'Wszedłeś do systemu jako'),
(286,9,'Ви увійшли до системи як'),
(287,1,'Приветствуем,'),
(287,2,'Вітаємо,'),
(287,3,'Greetings,'),
(287,4,'Grüße,'),
(287,5,'Pozdrowienia,'),
(287,9,'Вітаємо,'),
(293,1,'Восстановление пароля'),
(293,2,'Відновлення пароля'),
(293,3,'Password recovery'),
(293,4,'Passwortwiederherstellung'),
(293,5,'Odzyskiwanie hasła'),
(293,9,'Відновлення пароля'),
(295,1,'Неправильное имя пользователя'),
(295,2,'Невірне ім\'я користувача'),
(295,3,'Wrong username'),
(295,4,'Falscher Benutzername'),
(295,5,'Nieprawidłowa nazwa użytkownika'),
(295,9,'Невірне ім\'я користувача'),
(302,1,'Неправильный формат сегмента URL'),
(302,2,'Неправильний формат сегмента URL'),
(302,3,'Wrong URL segment format'),
(302,4,'Falsches URL-Segmentformat'),
(302,5,'Nieprawidłowy format segmentu URL'),
(302,9,'Неправильний формат сегмента URL'),
(303,1,'<P><STRONG>Пользователь с такими данными уже существует.</STRONG></P>\n<P>Скорее всего вы уже зарегистрированы в нашем магазине. </P>\n<P>Вам необходимо авторизоваться , перейдя на форму авторизации. </P>\n<P>Если вы забыли свой пароль, воспользуйтесь формой восстановления пароля, расположенной на той же странице.</P>'),
(303,2,'<P><STRONG>Користувач з такими даними уже існує.</STRONG></P>\n<P>Скоріш за все, ви вже зареєстровані у нашому магазині. </P>\n<P>Вам необхідно авторизуватися за допомогою форми авторизації. </P>\n<P>Якщо ви забули свій пароль, скористайтесь формою відновлення пароля, що знаходиться на тій же сторінці.</P>'),
(303,3,'<P><STRONG>A user with this data already exists</STRONG></P>\n<P>It is probable that you have already registered at our shop </P>\n<P> You need to log in by going to the authorization form.\n</P>\n<P>If you have forgotten your password, use the \'restore password\' button, located on the same page</P>'),
(303,4,'<p><strong>Ein Benutzer mit diesen Daten existiert bereits</strong></p>\n<p>Es ist wahrscheinlich, dass Sie sich bereits in unserem Shop registriert haben</p>\n<p>Sie müssen sich anmelden, indem Sie zum Anmeldeformular gehen.</p>\n<p>Wenn Sie Ihr Passwort vergessen haben, verwenden Sie die Schaltfläche \'Passwort wiederherstellen\', die sich auf derselben Seite befindet</p>'),
(303,5,'<p><strong>Użytkownik z tymi danymi już istnieje</strong></p>\n<p>Jest prawdopodobne, że już zarejestrowałeś się w naszym sklepie</p>\n<p>Musisz się zalogować, przechodząc do formularza autoryzacji.</p>\n<p>Jeśli zapomniałeś hasła, użyj przycisku \'przywróć hasło\', znajdującego się na tej samej stronie</p>'),
(303,9,'<P><STRONG>Користувач з такими даними уже існує.</STRONG></P>\n<P>Скоріш за все, ви вже зареєстровані у нашому магазині. </P>\n<P>Вам необхідно авторизуватися за допомогою форми авторизації. </P>\n<P>Якщо ви забули свій пароль, скористайтесь формою відновлення пароля, що знаходиться на тій же сторінці.</P>'),
(304,1,'Группы'),
(304,2,'Групи'),
(304,3,'Groups'),
(304,4,'Gruppen'),
(304,5,'Grupy'),
(304,9,'Групи'),
(312,1,'Открыть'),
(312,2,'Відкрити'),
(312,3,'Open'),
(312,4,'Öffnen'),
(312,5,'Otwórz'),
(312,9,'Відкрити'),
(313,1,'Создать папку'),
(313,2,'Створити папку'),
(313,3,'Add folder'),
(313,4,'Ordner hinzufügen'),
(313,5,'Dodaj folder'),
(313,9,'Створити папку'),
(322,1,'Маленькое изображение для:'),
(322,2,'Маленьке зображення для:'),
(322,3,'Small image for:'),
(322,4,'Kleine Bild für:'),
(322,5,'Mały obrazek dla:'),
(322,9,'Маленьке зображення для:'),
(326,1,'Фильтр'),
(326,2,'Фільтр'),
(326,3,'Filter'),
(326,4,'Filter'),
(326,5,'Filtr'),
(326,9,'Фільтр'),
(327,1,'Применить'),
(327,2,'Застосувати'),
(327,3,'Apply filter'),
(327,4,'Filter anwenden'),
(327,5,'Zastosuj filtr'),
(327,9,'Застосувати'),
(328,1,'Сбросить'),
(328,2,'Скинути'),
(328,3,'Reset'),
(328,4,'Zurücksetzen'),
(328,5,'Resetuj'),
(328,9,'Скинути'),
(339,1,'Нельзя удалить группу по умолчанию'),
(339,2,'Неможливо видалити групу за замовчанням'),
(339,3,'You cannot delete this group by default'),
(339,4,'Sie können diese Gruppe standardmäßig nicht löschen.'),
(339,5,'Nie możesz domyślnie usunąć tej grupy.'),
(339,9,'Неможливо видалити групу за замовчанням'),
(341,1,'Права на разделы'),
(341,2,'Права на розділи'),
(341,3,'Access to sections'),
(341,4,'Zugang zu Abschnitten'),
(341,5,'Dostęp do sekcji'),
(341,9,'Права на розділи'),
(344,1,'Главная'),
(344,2,'Головна'),
(344,3,'Main'),
(344,4,'Heim'),
(344,5,'Dom'),
(344,9,'Головна'),
(346,1,'Сохранить'),
(346,2,'Зберегти'),
(346,3,'Save'),
(346,4,'Speichern'),
(346,5,'Zapisz'),
(346,9,'Зберегти'),
(347,1,'Отменить'),
(347,2,'Відмінити'),
(347,3,'Cancel'),
(347,4,'Stornieren'),
(347,5,'Anuluj'),
(347,9,'Відмінити'),
(357,1,'Файловый репозиторий'),
(357,2,'Файловий репозиторій'),
(357,3,'File repository'),
(357,4,'Dateispeicherorte'),
(357,5,'Repozytorium plików'),
(357,9,'Файловий репозиторій'),
(372,1,'Новый пароль'),
(372,2,'Новий пароль'),
(372,3,'New password'),
(372,4,'Neues Passwort'),
(372,5,'Nowe hasło'),
(372,9,'Новий пароль'),
(373,1,'Подтвердите пароль'),
(373,2,'Підтвердіть пароль'),
(373,3,'Confirm password'),
(373,4,'Bestätige das Passwort'),
(373,5,'Potwierdź hasło'),
(373,9,'Підтвердіть пароль'),
(374,1,'Новый пароль и его подтверждение должны быть одинаковыми.'),
(374,2,'Новий пароль і його підтвердження повинні бути однакові.'),
(374,3,'The new password and its confirmation should be identical'),
(374,4,'Das neue Passwort und dessen Bestätigung sollten identisch sein.'),
(374,5,'Nowe hasło i jego potwierdzenie powinny być identyczne.'),
(374,9,'Новий пароль і його підтвердження повинні бути однакові.'),
(376,1,'Неверный логин или пароль'),
(376,2,'Невірний логін або пароль'),
(376,3,'Wrong login or password'),
(376,4,'Falsche Anmeldedaten oder Passwort'),
(376,5,'Nieprawidłowy login lub hasło'),
(376,9,'Невірний логін або пароль'),
(381,1,'Переводы'),
(381,2,'Переклади'),
(381,3,'Translations'),
(381,4,'Übersetzungen'),
(381,5,'Tłumaczenia'),
(381,9,'Переклади'),
(383,1,'Невозможно изменить порядок следования'),
(383,2,'Неможливо змінити порядок слідування'),
(383,3,'It is impossible to change the sequence'),
(383,4,'Es ist unmöglich, die Reihenfolge zu ändern.'),
(383,5,'Nie można zmienić kolejności.'),
(383,9,'Неможливо змінити порядок слідування'),
(385,1,'Режим просмотра'),
(385,2,'Режим перегляду'),
(385,3,'View mode'),
(385,4,'Ansichtsmodus'),
(385,5,'Tryb widoku'),
(385,9,'Режим перегляду'),
(389,1,'Неправильные данные.'),
(389,2,'Неправильні дані.'),
(389,3,'Wrong data'),
(389,4,'Falsche Daten'),
(389,5,'Błędne dane'),
(389,9,'Неправильні дані.'),
(429,1,'вернуться к списку'),
(429,2,'повернутися до списку'),
(429,3,'return to list'),
(429,4,'zurück zur Liste'),
(429,5,'powrót do listy'),
(429,9,'повернутися до списку'),
(439,1,'<span class=\"mark\">*</span> - поля, обязательные для заполнения'),
(439,2,'<span class=\"mark\">*</span> - поля, обов\'язкові для заповнення'),
(439,3,'<span class=\"mark\">*</span> - required fields'),
(439,4,'<span class=\"mark\">*</span> - erforderliche Felder'),
(439,5,'<span class=\"mark\">*</span> - pola wymagane'),
(439,9,'<span class=\"mark\">*</span> - поля, обов\'язкові для заповнення'),
(441,1,'Поздравляем, Вы успешно зарегистрировались. На указанный Вами адрес\nэлектронной почты отправлено письмо с Вашим паролем.'),
(441,2,'Вітаємо, Ви вдало зареєструвалися. На вказану Вами електронну адресу\nвідправлено лист з Вашим паролем.'),
(441,3,'Congratulations, your registration was successful. An email with your password was sent to your email address.'),
(441,4,'Herzlichen Glückwunsch, Ihre Registrierung war erfolgreich. Eine E-Mail mit Ihrem Passwort wurde an Ihre E-Mail-Adresse gesendet.'),
(441,5,'Gratulacje, rejestracja zakończyła się sukcesem. E-mail z Twoim hasłem został wysłany na Twój adres e-mail.'),
(441,9,'Вітаємо, Ви вдало зареєструвалися. На вказану Вами електронну адресу\nвідправлено лист з Вашим паролем.'),
(445,1,'Дополнительные файлы'),
(445,2,'Додаткові файли'),
(445,3,'Additional files'),
(445,4,'Zusätzliche Dateien'),
(445,5,'Dodatkowe pliki'),
(445,9,'Додаткові файли'),
(449,1,'Очистить форматирование'),
(449,2,'Очистити форматування'),
(449,3,'Clear the formatting'),
(449,4,'Die Formatierung löschen'),
(449,5,'Wyczyść formatowanie'),
(449,9,'Очистити форматування'),
(450,1,'Заголовок 1'),
(450,2,'Заголовок 1'),
(450,3,'Heading 1'),
(450,4,'Überschrift 1'),
(450,5,'Nagłówek 1'),
(450,9,'Заголовок 1'),
(451,1,'Заголовок 2'),
(451,2,'Заголовок 2'),
(451,3,'Heading 2'),
(451,4,'Überschrift 2'),
(451,5,'Nagłówek 2'),
(451,9,'Заголовок 2'),
(452,1,'Заголовок 3'),
(452,2,'Заголовок 3'),
(452,3,'Heading 3'),
(452,4,'Überschrift 3'),
(452,5,'Nagłówek 3'),
(452,9,'Заголовок 3'),
(453,1,'Заголовок 4'),
(453,2,'Заголовок 4'),
(453,3,'Heading 4'),
(453,4,'Überschrift 4'),
(453,5,'Nagłówek 4'),
(453,9,'Заголовок 4'),
(454,1,'Заголовок 5'),
(454,2,'Заголовок 5'),
(454,3,'Heading 5'),
(454,4,'Überschrift 5'),
(454,5,'Nagłówek 5'),
(454,9,'Заголовок 5'),
(455,1,'Заголовок 6'),
(455,2,'Заголовок 6'),
(455,3,'Heading 6'),
(455,4,'Überschrift 6'),
(455,5,'Nagłówek 6'),
(455,9,'Заголовок 6'),
(456,1,'Адрес'),
(456,2,'Адреса'),
(456,3,'Address'),
(456,4,'Adresse'),
(456,5,'Adres'),
(456,9,'Адреса'),
(457,1,'Полужирный шрифт'),
(457,2,'Напівжирний'),
(457,3,'Bold'),
(457,4,'Fett'),
(457,5,'Tłusty'),
(457,9,'Напівжирний'),
(458,1,'Курсив'),
(458,2,'Курсив'),
(458,3,'Italic'),
(458,4,'Kursiv'),
(458,5,'Kursy kursy'),
(458,9,'Курсив'),
(459,1,'Вставить ссылку'),
(459,2,'Вставити посилання'),
(459,3,'Paste link'),
(459,4,'Bitte Link einfügen.'),
(459,5,'Wklej link'),
(459,9,'Вставити посилання'),
(460,1,'Ненумерованный список'),
(460,2,'Ненумерований список'),
(460,3,'Unordered list'),
(460,4,'Ungeordnete Liste'),
(460,5,'Nieuporządkowana lista'),
(460,9,'Ненумерований список'),
(461,1,'Нумерованный список'),
(461,2,'Нумерований перелiк'),
(461,3,'Ordered List'),
(461,4,'Bestellte Liste'),
(461,5,'Lista uporządkowana'),
(461,9,'Нумерований перелiк'),
(462,1,'Выравнивание по левому краю'),
(462,2,'Вирiвнювання злiва'),
(462,3,'Align left'),
(462,4,'Links ausrichten'),
(462,5,'Wyrównaj do lewej'),
(462,9,'Вирiвнювання злiва'),
(463,1,'Выравнивание по правому краю'),
(463,2,'Вирiвнювання справа'),
(463,3,'Align right'),
(463,4,'Rechts ausrichten'),
(463,5,'Wyrównaj do prawej'),
(463,9,'Вирiвнювання справа'),
(464,1,'Выравнивание по центру'),
(464,2,'Вирiвнювання по центру'),
(464,3,'Align center'),
(464,4,'Zentrieren'),
(464,5,'Wyśrodkować'),
(464,9,'Вирiвнювання по центру'),
(465,1,'Выравнивание по ширине'),
(465,2,'Вирiвнювання по ширинi'),
(465,3,'Align width'),
(465,4,'Breite ausrichten'),
(465,5,'Dopasuj szerokość'),
(465,9,'Вирiвнювання по ширинi'),
(466,1,'Вставить ссылку на файл'),
(466,2,'Вставити посилання на файл'),
(466,3,'Paste link'),
(466,4,'Bitte fügen Sie den Link ein.'),
(466,5,'Wklej link'),
(466,9,'Вставити посилання на файл'),
(468,1,'Неправильный формат УРЛ'),
(468,2,'Невiрний формат УРЛ'),
(468,3,'Wrong URL format'),
(468,4,'Falsches URL-Format'),
(468,5,'Nieprawidłowy format URL'),
(468,9,'Невiрний формат УРЛ'),
(469,1,'Загрузить архив'),
(469,2,'Завантажити архiв'),
(469,3,'Upload archive'),
(469,4,'Archiv hochladen'),
(469,5,'Prześlij archiwum'),
(469,9,'Завантажити архiв'),
(471,1,'января'),
(471,2,'сiчня'),
(471,3,'January'),
(471,4,'Januar'),
(471,5,'Styczeń'),
(471,9,'сiчня'),
(488,1,'Роль'),
(488,2,'Роль'),
(488,3,'Role'),
(488,4,'Rolle'),
(488,5,'Rola'),
(488,9,'Роль'),
(489,1,'Языки'),
(489,2,'Мови'),
(489,3,'Languages'),
(489,4,'Sprachen'),
(489,5,'Języki'),
(489,9,'Мови'),
(490,1,'Пользователи'),
(490,2,'Користувачі'),
(490,3,'Users'),
(490,4,'Benutzer'),
(490,5,'Użytkownicy'),
(490,9,'Користувачі'),
(491,1,'Роли'),
(491,2,'Ролі'),
(491,3,'Roles'),
(491,4,'Rollen'),
(491,5,'Role'),
(491,9,'Ролі'),
(493,1,'Активизировать'),
(493,2,'Активувати'),
(493,3,'Activate'),
(493,4,'Aktivieren'),
(493,5,'Aktywuj'),
(493,9,'Активувати'),
(500,1,'Отступ снизу'),
(500,2,'Відступ знизу'),
(500,3,'Bottom margin'),
(500,4,'Unterer Rand'),
(500,5,'Margines dolny'),
(500,9,'Відступ знизу'),
(501,1,'Отступ слева'),
(501,2,'Відступ зліва'),
(501,3,'Left margin'),
(501,4,'Linker Rand'),
(501,5,'Margines lewy'),
(501,9,'Відступ зліва'),
(502,1,'Оступ справа'),
(502,2,'Відступ справа'),
(502,3,'Right margin'),
(502,4,'Rechter Rand'),
(502,5,'Prawy margines'),
(502,9,'Відступ справа'),
(503,1,'Отступ сверху'),
(503,2,'Відступ зверху'),
(503,3,'Top margin'),
(503,4,'Obere Marge'),
(503,5,'Górny margines'),
(503,9,'Відступ зверху'),
(504,1,'Уведомление о регистрации'),
(504,2,'Повідомлення про реєстрацію'),
(504,3,'Registration notification'),
(504,4,'Registrierungsbenachrichtigung'),
(504,5,'Powiadomienie o rejestracji'),
(504,9,'Повідомлення про реєстрацію'),
(506,1,'Группы'),
(506,2,'Групи'),
(506,3,'Groups'),
(506,4,'Gruppen'),
(506,5,'Grupy'),
(506,9,'Групи'),
(507,1,'<img src=\"images/loading.gif\" width=\"32\" height=\"32\"/>'),
(507,2,'<img src=\"images/loading.gif\" width=\"32\" height=\"32\"/>'),
(507,3,'<img src=\"images/loading.gif\" width=\"32\" height=\"32\"/>'),
(507,4,'<img src=\"images/loading.gif\" width=\"32\" height=\"32\">'),
(507,5,'<img src=\"images/loading.gif\" width=\"32\" height=\"32\">'),
(507,9,'<img src=\"images/loading.gif\" width=\"32\" height=\"32\"/>'),
(508,1,'и'),
(508,2,'та'),
(508,3,'and'),
(508,4,'und'),
(508,5,'i '),
(508,9,'та'),
(510,1,'Права на страницу'),
(510,2,'Права на сторінку'),
(510,3,'Page rights'),
(510,4,'Seitenrechte'),
(510,5,'Prawa strony'),
(510,9,'Права на сторінку'),
(542,1,'Печатать'),
(542,2,'Друкувати'),
(542,3,'Print'),
(542,4,'Drucken'),
(542,5,'Drukuj'),
(542,9,'Друкувати'),
(544,1,'Необходимо указать название раздела для всех не отключенных языковых версий'),
(544,2,'Необхідно вказати назву розділу для всіх активних мов'),
(544,3,'It is necessary to give the name of the section for all enabled language versions.'),
(544,4,'Es ist notwendig, den Namen des Abschnitts für alle aktivierten Sprachversionen anzugeben.'),
(544,5,'Należy podać nazwę sekcji dla wszystkich włączonych wersji językowych.'),
(544,9,'Необхідно вказати назву розділу для всіх активних мов'),
(545,1,'Поднять'),
(545,2,'Підняти'),
(545,3,'Up'),
(545,4,'Oben'),
(545,5,'W górę'),
(545,9,'Підняти'),
(546,1,'Опустить'),
(546,2,'Опустити'),
(546,3,'Down'),
(546,4,'Unten'),
(546,5,'W dół'),
(546,9,'Опустити'),
(690,1,'Введите Ваш логин (в качестве логина используется адрес Вашей\nэлектронной почты), желаемый никнейм (Ваше отображаемое имя) и полное\nимя. Система автоматически создаст пароль и отправит Вам по указанному\nэлектронному адресу.'),
(690,2,'Введіть Ваш логін (Ваша електронна адреса), бажаний нікнейм та повне\nім\'я. Система автоматично створить пароль та надішле на вказану\nелектронну адресу.'),
(690,3,'Enter your login (your email), nickname (the name that will be displayed) and your full name. The system will automatically create a password and send it to your email.'),
(690,4,'Geben Sie Ihren Login (Ihre E-Mail), Ihren Spitznamen (den Namen, der angezeigt wird) und Ihren vollständigen Namen ein. Das System wird automatisch ein Passwort erstellen und es an Ihre E-Mail senden.'),
(690,5,'Wprowadź swoje dane logowania (swój adres e-mail), pseudonim (imię, które będzie wyświetlane) oraz swoje pełne imię i nazwisko. System automatycznie utworzy hasło i wyśle je na twój adres e-mail.'),
(690,9,'Введіть Ваш логін (Ваша електронна адреса), бажаний нікнейм та повне\nім\'я. Система автоматично створить пароль та надішле на вказану\nелектронну адресу.'),
(726,1,'Сегодня'),
(726,2,'Сьогодні'),
(726,3,'Today'),
(726,4,'Heute'),
(726,5,'Dziś'),
(726,9,'Сьогодні'),
(739,1,'с'),
(739,2,'з'),
(739,3,'from'),
(739,4,'von'),
(739,5,'z'),
(739,9,'з'),
(740,1,'по'),
(740,2,'по'),
(740,3,'?? по'),
(740,4,'?? по'),
(740,5,'?? po'),
(740,9,'по'),
(752,1,'подробнее'),
(752,2,'детальніше'),
(752,3,'details'),
(752,4,'Einzelheiten'),
(752,5,'szczegóły'),
(752,9,'детальніше'),
(783,1,'Необходимо загрузить файл'),
(783,2,'Необхідно завантажити файл'),
(783,3,'It is necessary to upload the file'),
(783,4,'Es ist notwendig, die Datei hochzuladen.'),
(783,5,'Należy przesłać plik.'),
(783,9,'Необхідно завантажити файл'),
(952,1,'Пароли не совпадают'),
(952,2,'Паролі не співпадають'),
(952,3,'Passwords do not match'),
(952,4,'Passwörter stimmen nicht überein.'),
(952,5,'Hasła nie pasują'),
(952,9,'Паролі не співпадають'),
(1081,1,'Идентификатор блока'),
(1081,2,'Ідентифікатор блоку'),
(1081,3,'Block identifier'),
(1081,4,'Blockkennung'),
(1081,5,'Identyfikator bloku'),
(1081,9,'Ідентифікатор блоку'),
(1089,1,'Вернуть к начальному виду'),
(1089,2,'Повернути до початкового вигляду'),
(1089,3,'Return to initial view'),
(1089,4,'Zurück zur ursprünglichen Ansicht'),
(1089,5,'Powrót do widoku początkowego'),
(1089,9,'Повернути до початкового вигляду'),
(1093,1,'Изменено'),
(1093,2,'Змінено'),
(1093,3,'Changed'),
(1093,4,'Geändert'),
(1093,5,'Zmienione'),
(1093,9,'Змінено'),
(1105,1,'Сбросить шаблоны'),
(1105,2,'Скинути шаблони'),
(1105,3,'Reset templates'),
(1105,4,'Vorlagen zurücksetzen'),
(1105,5,'Zresetuj szablony'),
(1105,9,'Скинути шаблони'),
(1134,1,'Сайты'),
(1134,2,'Сайти'),
(1134,3,'Websites'),
(1134,4,'Webseiten'),
(1134,5,'Strony internetowe'),
(1134,9,'Сайти'),
(1135,1,'Управление блоками'),
(1135,2,'Керування блоками'),
(1135,3,'Edit blocks'),
(1135,4,'Bearbeite Blöcke'),
(1135,5,'Edytuj bloki'),
(1135,9,'Керування блоками'),
(1142,1,'Все новости'),
(1142,2,'Всі новини'),
(1142,3,'All news'),
(1142,4,'Alle Nachrichten'),
(1142,5,'Wszystkie wiadomości'),
(1142,9,'Всі новини'),
(1147,1,'содержит'),
(1147,2,'містить'),
(1147,3,'contains'),
(1147,4,'enthält'),
(1147,5,'zawiera'),
(1147,9,'містить'),
(1148,1,'не содержит'),
(1148,2,'не містить'),
(1148,3,'does not contain'),
(1148,4,'enthält nicht'),
(1148,5,'nie zawiera'),
(1148,9,'не містить'),
(1149,1,'между'),
(1149,2,'між'),
(1149,3,'between'),
(1149,4,'zwischen'),
(1149,5,'pomiędzy'),
(1149,9,'між'),
(1152,1,'Вы уверены, что хотите вернуть шаблоны всех страниц к начальному виду? Отменить это действие будет невозможно.'),
(1152,2,'Ви впевнені, що хочете повернути шаблони всіх сторінок до початкового вигляду? Відмінити цю дію буде неможливо.'),
(1152,3,'Are you sure you want to return all the page templates to their initial state? Cancelling this action would be impossible.'),
(1152,4,'Bist du sicher, dass du alle Seitenvorlagen in ihren ursprünglichen Zustand zurückversetzen möchtest? Es wäre unmöglich, diese Aktion abzubrechen.'),
(1152,5,'Czy jesteś pewien, że chcesz przywrócić wszystkie szablony stron do ich początkowego stanu? Anulowanie tej operacji będzie niemożliwe.'),
(1152,9,'Ви впевнені, що хочете повернути шаблони всіх сторінок до початкового вигляду? Відмінити цю дію буде неможливо.'),
(1153,1,'Шаблоны всех страниц приведены к начальному виду'),
(1153,2,'Шаблони всіх сторінок приведено до початкового вигляду'),
(1153,3,'Templates of all the pages have been returned to their initial state'),
(1153,4,'Die Vorlagen aller Seiten wurden in ihren ursprünglichen Zustand zurückversetzt.'),
(1153,5,'Szablony wszystkich stron zostały przywrócone do swojego pierwotnego stanu.'),
(1153,9,'Шаблони всіх сторінок приведено до початкового вигляду'),
(1168,1,'строка'),
(1168,2,'рядок'),
(1168,3,'Line'),
(1168,4,'Linie'),
(1168,5,'Linia'),
(1168,9,'рядок'),
(1169,1,'логическое'),
(1169,2,'логічне'),
(1169,3,'logical'),
(1169,4,'logisch'),
(1169,5,'logiczny'),
(1169,9,'логічне'),
(1170,1,'текстовое'),
(1170,2,'текстове'),
(1170,3,'text'),
(1170,4,'Bitte geben Sie den zu übersetzenden Text an.'),
(1170,5,'Please provide the text you would like to have translated into Polish.'),
(1170,9,'текстове'),
(1171,1,'список значений'),
(1171,2,'список значень'),
(1171,3,'List of values'),
(1171,4,'Liste der Werte'),
(1171,5,'Lista wartości'),
(1171,9,'список значень'),
(1172,1,'дата'),
(1172,2,'дата'),
(1172,3,'Date'),
(1172,4,'Datum'),
(1172,5,'Data'),
(1172,9,'дата'),
(1173,1,'дата и время'),
(1173,2,'дата і час'),
(1173,3,'Date and time'),
(1173,4,'Datum und Uhrzeit'),
(1173,5,'Data i czas'),
(1173,9,'дата і час'),
(1174,1,'файл'),
(1174,2,'файл'),
(1174,3,'File'),
(1174,4,'Datei'),
(1174,5,'Plik'),
(1174,9,'файл'),
(1178,1,'инфо'),
(1178,2,'інфо'),
(1178,3,'Information'),
(1178,4,'Information'),
(1178,5,'Informacja'),
(1178,9,'інфо'),
(1179,1,'множественный выбор'),
(1179,2,'множинний вибір'),
(1179,3,'Multiple Choice'),
(1179,4,'Multiple Choice'),
(1179,5,'Wielokrotny wybór'),
(1179,9,'множинний вибір'),
(1197,1,'Редактировать следующую запись'),
(1197,2,'Редагувати наступний запис'),
(1197,3,'Edit next entry'),
(1197,4,'Bearbeite den nächsten Eintrag.'),
(1197,5,'Edytuj następny wpis'),
(1197,9,'Редагувати наступний запис'),
(1198,1,'Редактировать предыдущую запись'),
(1198,2,'Редагувати попередній запис'),
(1198,3,'Edit previous entry'),
(1198,4,'Vorherigen Eintrag bearbeiten'),
(1198,5,'Edytuj poprzedni wpis'),
(1198,9,'Редагувати попередній запис'),
(1207,1,'Вставить embed код'),
(1207,2,'Вставити embed код'),
(1207,3,'Paste embedded code'),
(1207,4,'Fügen Sie den eingebetteten Code ein.'),
(1207,5,'Wklej kod osadzony'),
(1207,9,'Вставити embed код'),
(1208,1,'Применить'),
(1208,2,'Применить'),
(1208,3,'Apply'),
(1208,4,'Anwenden'),
(1208,5,'Zastosuj'),
(1208,9,'Применить'),
(1211,1,'Макет страницы:'),
(1211,2,'Макет сторінки:'),
(1211,3,'Page layout:'),
(1211,4,'Seitenlayout:'),
(1211,5,'Układ strony:'),
(1211,9,'Макет сторінки:'),
(1212,1,'Содержимое страницы:'),
(1212,2,'Вміст сторінки:'),
(1212,3,'Page content:'),
(1212,4,'Seiteninhalt:'),
(1212,5,'Sure, please provide the text you would like to have translated into Polish.'),
(1212,9,'Вміст сторінки:'),
(1213,1,'Действие:'),
(1213,2,'Дія:'),
(1213,3,'Action:'),
(1213,4,'Aktion:'),
(1213,5,'Akcja:'),
(1213,9,'Дія:'),
(1214,1,'Сохранить только для этой страницы'),
(1214,2,'Зберегти для поточної'),
(1214,3,'Save only for this page'),
(1214,4,'Nur für diese Seite speichern'),
(1214,5,'Zapisz tylko na tej stronie'),
(1214,9,'Зберегти для поточної'),
(1215,1,'Сохранить как новое'),
(1215,2,'Зберегти як нове'),
(1215,3,'Save as new'),
(1215,4,'Als Neu speichern'),
(1215,5,'Zapisz jako nowy'),
(1215,9,'Зберегти як нове'),
(1216,1,'Сохранить в текущем шаблоне'),
(1216,2,'Збререгти в шаблоні сторінки'),
(1216,3,'Save in the current template'),
(1216,4,'Speichern im aktuellen Template'),
(1216,5,'Zapisz w bieżącym szablonie'),
(1216,9,'Збререгти в шаблоні сторінки'),
(1228,1,'Всего'),
(1228,2,'Всього'),
(1228,3,'Total'),
(1228,4,'Gesamt'),
(1228,5,'Całkowity'),
(1228,9,'Всього'),
(1259,1,'Нет ни одной записи.'),
(1259,2,'Немає жодного запису.'),
(1259,3,'There are no records'),
(1259,4,'Es gibt keine Aufzeichnungen.'),
(1259,5,'Nie ma zapisów'),
(1259,9,'Немає жодного запису.'),
(1286,1,'<p>Здравствуйте, $name.<br>\nВы были зарегистрированы на сайте.</p>\n<p>Ваш логин: $login<br>\nПароль: $password</p>'),
(1286,2,'<p>Здравствуйте, $name.<br>\nВы были зарегистрированы на сайте.</p>\n<p>Ваш логин: $login<br>\nПароль: $password</p>\n</div>'),
(1286,3,'<p>Hello, $name.<br>\nYou have been registered on the website.</p>\n<p>Your login: $login<br>\nPassword: $password</p>'),
(1286,4,'<p>Hallo, $name.<br>\nSie wurden auf der Website registriert.</p>\n<p>Ihr Login: $login<br>\nPasswort: $password</p>'),
(1286,5,'<p>Witaj, $name.<br>\nZostałeś zarejestrowany na stronie internetowej.</p>\n<p>Twoje logowanie: $login<br>\nHasło: $password</p>'),
(1286,9,'<p>Здравствуйте, $name.<br>\nВы были зарегистрированы на сайте.</p>\n<p>Ваш логин: $login<br>\nПароль: $password</p>\n</div>'),
(1287,1,'Удалить'),
(1287,2,'Видалити'),
(1287,3,'Delete'),
(1287,4,'Artikel löschen'),
(1287,5,'Usuń artykuł'),
(1287,9,'Видалити'),
(1288,1,'Добавить'),
(1288,2,'Додати'),
(1288,3,'Add'),
(1288,4,'Artikel hinzufügen'),
(1288,5,'Dodaj artykuł'),
(1288,9,'Додати'),
(1289,1,'Редактировать'),
(1289,2,'Редагувати'),
(1289,3,'Edit'),
(1289,4,'Bearbeiten'),
(1289,5,'Edytować'),
(1289,9,'Редагувати'),
(1344,1,'Путь к файлу'),
(1344,2,'Шлях до файлу'),
(1344,3,'The path to the file'),
(1344,4,'Der Pfad zur Datei'),
(1344,5,'Ścieżka do pliku'),
(1344,9,'Шлях до файлу'),
(1346,1,'Загрузить'),
(1346,2,'Завантажити'),
(1346,3,'Upload'),
(1346,4,'Hochladen'),
(1346,5,'Prześlij'),
(1346,9,'Завантажити'),
(1351,1,'Домены'),
(1351,2,'Домени'),
(1351,3,'Domains'),
(1351,4,'Domains'),
(1351,5,'Domeny'),
(1351,9,'Домени'),
(1358,1,'Выбрать файл'),
(1358,2,'Обрати файл'),
(1358,3,'Choose file'),
(1358,4,'Datei wählen'),
(1358,5,'Wybierz plik'),
(1358,9,'Обрати файл'),
(1430,1,'Боковая панель'),
(1430,2,'Бічна панель'),
(1430,3,'Sidebar'),
(1430,4,'Seitenleiste'),
(1430,5,'Pasek boczny'),
(1430,9,'Бічна панель'),
(1456,1,'Выйти'),
(1456,2,'Вийти'),
(1456,3,'Log out'),
(1456,4,'Abmelden'),
(1456,5,'Wyloguj się'),
(1456,9,'Вийти'),
(1458,1,'Профайл'),
(1458,2,'Профайл'),
(1458,3,'Profile'),
(1458,4,'Profil'),
(1458,5,'Profil'),
(1458,9,'Профайл'),
(1574,1,'очистить'),
(1574,2,'очистить'),
(1574,3,'clear'),
(1574,4,'löschen'),
(1574,5,'czysty'),
(1574,9,'очистить'),
(1942,1,'Такой почтовый ящик уже используется.'),
(1942,2,'Такой почтовый ящик уже используется.'),
(1942,3,'This email is already in use'),
(1942,4,'Diese E-Mail wird bereits verwendet.'),
(1942,5,'Ten adres e-mail jest już używany.'),
(1942,9,'Такой почтовый ящик уже используется.'),
(1986,1,'Переместить'),
(1986,2,'Переместить'),
(1986,3,'Move'),
(1986,4,'Bewege'),
(1986,5,'Przenieś'),
(1986,9,'Переместить'),
(2014,1,'Email'),
(2014,2,'Email'),
(2014,3,'Email'),
(2014,4,'E-Mail'),
(2014,5,'E-mail'),
(2014,9,'Email'),
(2015,1,'Телефонный номер'),
(2015,2,'Телефонний номер'),
(2015,3,'Telephone number'),
(2015,4,'Telefonnummer'),
(2015,5,'Numer telefonu'),
(2015,9,'Телефонний номер'),
(2026,1,'Быстрая загрузка'),
(2026,2,'Швидке завантаження'),
(2026,3,'Quick upload'),
(2026,4,'Schneller Upload'),
(2026,5,'Szybkie przesyłanie'),
(2026,9,'Швидке завантаження'),
(2037,1,'Опубликовать'),
(2037,2,'Опублікувати'),
(2037,3,'Publish'),
(2037,4,'Veröffentlichen'),
(2037,5,'Opublikować'),
(2037,9,'Опублікувати'),
(2038,1,'Не публиковать'),
(2038,2,'Не публікувати'),
(2038,3,'Do not publish'),
(2038,4,'Nicht veröffentlichen'),
(2038,5,'Nie publikuj'),
(2038,9,'Не публікувати'),
(2040,1,'Идет подготовка...'),
(2040,2,'Готується...'),
(2040,3,'Wait please...'),
(2040,4,'Bitte warten...'),
(2040,5,'Poczekaj proszę...'),
(2040,9,'Готується...'),
(2042,1,'Медиа-файл не готов'),
(2042,2,'Медіа-файл не готовий'),
(2042,3,'Media file is not ready'),
(2042,4,'Mediendatei ist nicht bereit'),
(2042,5,'Plik multimedialny nie jest gotowy.'),
(2042,9,'Медіа-файл не готовий'),
(2043,1,'Менеджер изображений'),
(2043,2,'Менеджер зображень'),
(2043,3,'Image manager'),
(2043,4,'Bildmanager'),
(2043,5,'Menadżer obrazów'),
(2043,9,'Менеджер зображень'),
(2046,1,'Готовность'),
(2046,2,'Готовность'),
(2046,3,'Readiness'),
(2046,4,'Bereitschaft'),
(2046,5,'Gotowość'),
(2046,9,'Готовность'),
(2048,1,'Профиль пользователя'),
(2048,2,'Профайл користувача'),
(2048,3,'User profile'),
(2048,4,'Benutzerprofil'),
(2048,5,'Profil użytkownika'),
(2048,9,'Профайл користувача'),
(2051,1,'Название'),
(2051,2,'Назва'),
(2051,3,'Name'),
(2051,4,'Name'),
(2051,5,'Nazwa'),
(2051,9,'Назва'),
(2284,1,'Обновить'),
(2284,2,'Оновити'),
(2284,3,'Refresh'),
(2284,4,'Aktualisieren'),
(2284,5,'Odśwież'),
(2284,9,'Оновити'),
(2472,1,'Отменить'),
(2472,2,'Скасувати'),
(2472,3,'Cancel'),
(2472,4,'Stornieren'),
(2472,5,'Anuluj'),
(2472,9,'Скасувати'),
(2505,1,'Пароль слишком короткий'),
(2505,2,'Пароль занадто короткий'),
(2505,3,'The password is too short'),
(2505,4,'Das Passwort ist zu kurz.'),
(2505,5,'Hasło jest zbyt krótkie'),
(2505,9,'Пароль занадто короткий'),
(1112431,1,'Закрыть'),
(1112431,2,'Закрити'),
(1112431,3,'Close'),
(1112431,4,'Schließen'),
(1112431,5,'Zamknij'),
(1112431,9,'Закрити'),
(1112459,1,'Войти'),
(1112459,2,'Увійти'),
(1112459,3,'Login'),
(1112459,4,'Login'),
(1112459,5,'Login'),
(1112459,9,'Увійти'),
(1112460,1,'Ваш E-Mail'),
(1112460,2,'Ваш E-Mail'),
(1112460,3,'Your email'),
(1112460,4,'Ihre E-Mail'),
(1112460,5,'Twój e-mail'),
(1112460,9,'Ваш E-Mail'),
(1112461,1,'Пароль'),
(1112461,2,'Пароль'),
(1112461,3,'Password'),
(1112461,4,'Passwort'),
(1112461,5,'Hasło'),
(1112461,9,'Пароль'),
(1112462,1,'Забыли пароль?'),
(1112462,2,'Забули свій пароль?'),
(1112462,3,'Forgot your password?'),
(1112462,4,'Passwort vergessen?'),
(1112462,5,'Zapomniałeś hasła?'),
(1112462,9,'Забули свій пароль?'),
(1112464,1,'Осуществлен выход учетной записи из системы.'),
(1112464,2,'Здійснено вихід облікового запису із системи.'),
(1112464,3,'The account has been logged out of the system.'),
(1112464,4,'Das Konto wurde vom System abgemeldet.'),
(1112464,5,'Konto zostało wylogowane z systemu.'),
(1112464,9,'Здійснено вихід облікового запису із системи.'),
(1112466,1,'Мои данные'),
(1112466,2,'Мої дані'),
(1112466,3,'My details'),
(1112466,4,'Meine Daten'),
(1112466,5,'Moje dane'),
(1112466,9,'Мої дані'),
(1112467,1,'Смена пароля'),
(1112467,2,'Зміна пароля'),
(1112467,3,'Change password'),
(1112467,4,'Kennwort ändern'),
(1112467,5,'Zmień hasło'),
(1112467,9,'Зміна пароля'),
(1112468,1,'Смена E-Mail'),
(1112468,2,'Зміна E-Mail'),
(1112468,3,'Change E-Mail'),
(1112468,4,'E-Mail ändern'),
(1112468,5,'Zmień e-mail'),
(1112468,9,'Зміна E-Mail'),
(1112469,1,'Сохранение'),
(1112469,2,'Збереження'),
(1112469,3,'Saving'),
(1112469,4,'Sparen'),
(1112469,5,'Oszczędność'),
(1112469,9,'Збереження'),
(1112470,1,'© 2025'),
(1112470,2,'© 2025'),
(1112470,3,'© 2025'),
(1112470,4,'© 2025'),
(1112470,5,'© 2025'),
(1112470,9,'© 2025'),
(1112472,1,'Войти с помощью:'),
(1112472,2,'Увійти за допомогою:'),
(1112472,3,'Sign in with:'),
(1112472,4,'Melden Sie sich an mit:'),
(1112472,5,'Zaloguj się za pomocą:'),
(1112472,9,'Увійти за допомогою:'),
(1112473,1,'Авторизация'),
(1112473,2,'Авторизація'),
(1112473,3,'Authorization'),
(1112473,4,'Genehmigung'),
(1112473,5,'Upoważnienie'),
(1112473,9,'Авторизація'),
(1112474,1,'Воостановить пароль'),
(1112474,2,'Відновити пароль'),
(1112474,3,'Recover password'),
(1112474,4,'Passwort wiederherstellen'),
(1112474,5,'Odzyskaj hasło'),
(1112474,9,'Відновити пароль'),
(1112475,1,'Ваш код был отправлен.'),
(1112475,2,'Ваш код було надіслано.'),
(1112475,3,'Your code has been sent.'),
(1112475,4,'Ihr Code wurde gesendet.'),
(1112475,5,'Twój kod został wysłany.'),
(1112475,9,'Ваш код було надіслано.'),
(1112476,1,'Свойства'),
(1112476,2,'Властивості'),
(1112476,3,'Properties'),
(1112476,4,'Eigenschaften'),
(1112476,5,'Właściwości'),
(1112476,9,'Властивості'),
(1112477,1,'<p>Dear user!</p>\n<p>We have received a request from you to change the password for your\naccount on the system.</p>\n<p>To change your password, click the link below.</p>\n<p><a href=\"$link\">$link</a></p>\n<p>The link will be available within 24 hours or until your next\nrequest for a password change.</p>'),
(1112477,2,'<p>Dear user!</p>\n<p>We have received a request from you to change the password for your\naccount on the system.</p>\n<p>To change your password, click the link below.</p>\n<p><a href=\"$link\">$link</a></p>\n<p>The link will be available within 24 hours or until your next\nrequest for a password change.</p>'),
(1112477,3,'<p>Dear user!</p>\n<p>We have received a request from you to change the password for your\naccount on the system.</p>\n<p>To change your password, click the link below.</p>\n<p><a href=\"$link\">$link</a></p>\n<p>The link will be available within 24 hours or until your next\nrequest for a password change.</p>'),
(1112477,4,'<p>Dear user!</p>\n<p>We have received a request from you to change the password for your\naccount on the system.</p>\n<p>To change your password, click the link below.</p>\n<p><a href=\"$link\">$link</a></p>\n<p>The link will be available within 24 hours or until your next\nrequest for a password change.</p>'),
(1112477,5,'<p>Dear user!</p>\n<p>We have received a request from you to change the password for your\naccount on the system.</p>\n<p>To change your password, click the link below.</p>\n<p><a href=\"$link\">$link</a></p>\n<p>The link will be available within 24 hours or until your next\nrequest for a password change.</p>'),
(1112477,9,'<p>Dear user!</p>\n<p>We have received a request from you to change the password for your\naccount on the system.</p>\n<p>To change your password, click the link below.</p>\n<p><a href=\"$link\">$link</a></p>\n<p>The link will be available within 24 hours or until your next\nrequest for a password change.</p>'),
(1112478,1,'Password changed'),
(1112478,2,'Password changed'),
(1112478,3,'Password changed'),
(1112478,4,'Password changed'),
(1112478,5,'Password changed'),
(1112478,9,'Password changed'),
(1112479,1,'Авторизацию выполнено!'),
(1112479,2,'Авторизацію виконано!'),
(1112479,3,'Authorization completed!'),
(1112479,4,'Autorisierung abgeschlossen!'),
(1112479,5,'Autoryzacja zakończona!'),
(1112479,9,'Авторизацію виконано!'),
(1112480,1,'Характеристики'),
(1112480,2,'Характеристики'),
(1112480,3,'Characteristics'),
(1112480,4,'Eigenschaften'),
(1112480,5,'Charakterystyka'),
(1112480,9,'Характеристики'),
(1112481,1,'Характеристики'),
(1112481,2,'Характеристики'),
(1112481,3,'Characteristics'),
(1112481,4,'Eigenschaften'),
(1112481,5,'Charakterystyka'),
(1112481,9,'Характеристики'),
(1112483,1,'Вы уверены, что хотите сохранить изменения?'),
(1112483,2,'Ви впевнені, що хочете зберегти зміни?'),
(1112483,3,'Are you sure you want to save the changes?'),
(1112483,4,'Sind Sie sicher, dass Sie Änderungen beibehalten möchten?'),
(1112483,5,'Czy na pewno chcesz zachować zmiany?'),
(1112483,9,'Ви впевнені, що хочете зберегти зміни?');
/*!40000 ALTER TABLE `share_lang_tags_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_languages`
--

DROP TABLE IF EXISTS `share_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_languages` (
  `lang_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lang_locale` char(30) DEFAULT NULL,
  `lang_abbr` char(2) NOT NULL,
  `lang_name` char(20) NOT NULL,
  `lang_default` tinyint(1) DEFAULT 0,
  `lang_order_num` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`lang_id`),
  KEY `idx_abbr` (`lang_abbr`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_languages`
--

LOCK TABLES `share_languages` WRITE;
/*!40000 ALTER TABLE `share_languages` DISABLE KEYS */;
INSERT INTO `share_languages` VALUES
(1,'ru_UA.UTF8','ru','Русский',0,6),
(2,'uk_UA.UTF8','uk','Українська',1,2),
(3,'','en','English',0,3),
(4,'','de','Deutsch',0,5),
(5,NULL,'pl','Poland',0,4),
(9,NULL,'ts','Test11',0,2);
/*!40000 ALTER TABLE `share_languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_session`
--

DROP TABLE IF EXISTS `share_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_session` (
  `session_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `session_native_id` varchar(255) NOT NULL,
  `session_last_impression` int(11) NOT NULL,
  `session_created` int(11) NOT NULL,
  `session_expires` int(11) NOT NULL,
  `session_ip` int(11) unsigned DEFAULT NULL,
  `session_user_agent` char(255) DEFAULT NULL,
  `u_id` int(10) unsigned DEFAULT NULL,
  `session_data` varchar(5000) DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `session_native_id` (`session_native_id`),
  KEY `i_session_u_id` (`u_id`),
  KEY `i_session_ip` (`session_ip`),
  KEY `session_expires` (`session_expires`),
  CONSTRAINT `share_session_ibfk_1` FOREIGN KEY (`u_id`) REFERENCES `user_users` (`u_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1140 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_session`
--

LOCK TABLES `share_session` WRITE;
/*!40000 ALTER TABLE `share_session` DISABLE KEYS */;
INSERT INTO `share_session` VALUES
(1130,'e6f15abb8e6ee50c58f29674012f0bbc',1761415170,1760486739,1762171170,2130706433,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',22,'userID|i:22;_sf2_attributes|a:0:{}_symfony_flashes|a:0:{}_sf2_meta|a:3:{s:1:\"u\";i:1761415170;s:1:\"c\";i:1760486741;s:1:\"l\";i:756000;}'),
(1139,'fa2adee9f5c504b96b13f3b8ca70c5ef',1761717256,1761691187,1762473256,2130706433,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',22,'userID|i:22;_sf2_attributes|a:0:{}_symfony_flashes|a:0:{}_sf2_meta|a:3:{s:1:\"u\";i:1761717256;s:1:\"c\";i:1761691189;s:1:\"l\";i:756000;}');
/*!40000 ALTER TABLE `share_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sitemap`
--

DROP TABLE IF EXISTS `share_sitemap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sitemap` (
  `smap_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `site_id` int(10) unsigned NOT NULL,
  `smap_layout` char(200) NOT NULL,
  `smap_layout_xml` text DEFAULT NULL,
  `smap_content` char(200) NOT NULL,
  `smap_content_xml` text DEFAULT NULL,
  `smap_pid` int(10) unsigned DEFAULT NULL,
  `smap_segment` char(50) NOT NULL,
  `smap_order_num` int(10) unsigned DEFAULT 1,
  `smap_redirect_url` char(250) DEFAULT NULL,
  `smap_meta_robots` text DEFAULT NULL,
  PRIMARY KEY (`smap_id`),
  UNIQUE KEY `smap_pid` (`smap_pid`,`site_id`,`smap_segment`),
  KEY `site_id` (`site_id`),
  KEY `smap_order_num` (`smap_order_num`),
  CONSTRAINT `share_sitemap_ibfk_8` FOREIGN KEY (`smap_pid`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_sitemap_ibfk_9` FOREIGN KEY (`site_id`) REFERENCES `share_sites` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3745 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sitemap`
--

LOCK TABLES `share_sitemap` WRITE;
/*!40000 ALTER TABLE `share_sitemap` DISABLE KEYS */;
INSERT INTO `share_sitemap` VALUES
(80,1,'default.layout.xml',NULL,'share/childs.content.xml',NULL,NULL,'',538,NULL,NULL),
(330,1,'default.layout.xml',NULL,'sign_in.content.xml',NULL,80,'login',2,NULL,NULL),
(3625,1,'default.layout.xml',NULL,'recover_password.content.xml',NULL,80,'restore-password',5,NULL,NULL),
(3675,1,'account.layout.xml',NULL,'childs.content.xml',NULL,80,'my',6,NULL,NULL),
(3707,1,'google_sitemap.layout.xml',NULL,'google_sitemap.content.xml',NULL,80,'google_sitemap',1,NULL,NULL),
(3725,1,'account.layout.xml',NULL,'wizard.content.xml',NULL,3675,'wizard',2,NULL,NULL),
(3727,1,'share/default.layout.xml',NULL,'test_editor.content.xml',NULL,80,'test',3,NULL,NULL),
(3728,1,'account.layout.xml',NULL,'profile.content.xml',NULL,3675,'persona-data',1,NULL,NULL),
(3729,1,'default.layout.xml',NULL,'sign_in.content.xml',NULL,3675,'logout',3,NULL,NULL),
(3730,1,'account.layout.xml',NULL,'Testfeed.content.xml',NULL,80,'test22',4,NULL,NULL),
(3732,1,'account.layout.xml',NULL,'main.content.xml',NULL,3730,'test5',4,NULL,NULL),
(3733,1,'share/default.layout.xml',NULL,'share/textblock.content.xml',NULL,3730,'test6',1,NULL,NULL),
(3734,1,'account.layout.xml',NULL,'main.content.xml',NULL,3730,'tttest',3,NULL,NULL),
(3737,1,'account.layout.xml',NULL,'main.content.xml',NULL,3730,'aasdas',5,NULL,NULL),
(3741,1,'default.layout.xml',NULL,'share/textblock.content.xml',NULL,3730,'5555',2,NULL,NULL);
/*!40000 ALTER TABLE `share_sitemap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sitemap_tags`
--

DROP TABLE IF EXISTS `share_sitemap_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sitemap_tags` (
  `smap_id` int(10) unsigned NOT NULL,
  `tag_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`smap_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `share_sitemap_tags_ibfk_1` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_sitemap_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `share_tags` (`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sitemap_tags`
--

LOCK TABLES `share_sitemap_tags` WRITE;
/*!40000 ALTER TABLE `share_sitemap_tags` DISABLE KEYS */;
INSERT INTO `share_sitemap_tags` VALUES
(3727,1);
/*!40000 ALTER TABLE `share_sitemap_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sitemap_translation`
--

DROP TABLE IF EXISTS `share_sitemap_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sitemap_translation` (
  `smap_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `smap_name` varchar(200) DEFAULT NULL,
  `smap_description_rtf` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `smap_html_title` varchar(250) DEFAULT NULL,
  `smap_meta_keywords` text DEFAULT NULL,
  `smap_meta_description` text DEFAULT NULL,
  `smap_is_disabled` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`lang_id`,`smap_id`),
  KEY `sitemaplv_sitemap_FK` (`smap_id`),
  CONSTRAINT `share_sitemap_translation_ibfk_1` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_sitemap_translation_ibfk_2` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sitemap_translation`
--

LOCK TABLES `share_sitemap_translation` WRITE;
/*!40000 ALTER TABLE `share_sitemap_translation` DISABLE KEYS */;
INSERT INTO `share_sitemap_translation` VALUES
(80,1,'Главная страница',NULL,NULL,NULL,'Откройте для себя инновационные возможности нашей демонстрационной платформы! Удобный интерфейс, передовые инструменты и эксклюзивный доступ к последним технологическим решениям ждут вас. Идеально подходит для тех, кто интересуется будущим цифровых технологий.',0),
(330,1,'Войти',NULL,'Вход',NULL,NULL,0),
(3625,1,'Восстановление пароля',NULL,NULL,NULL,NULL,0),
(3675,1,'Личный кабинет',NULL,NULL,NULL,NULL,0),
(3725,1,'Конструктор шаблонов',NULL,NULL,NULL,NULL,0),
(3727,1,'Тест',NULL,NULL,NULL,NULL,0),
(3728,1,'Персональные данные',NULL,NULL,NULL,NULL,0),
(3729,1,'Выйти',NULL,NULL,NULL,NULL,0),
(3730,1,'test2r13',NULL,NULL,NULL,NULL,0),
(3732,1,'test5',NULL,NULL,NULL,NULL,0),
(3733,1,'test5',NULL,NULL,NULL,NULL,0),
(3734,1,'tttest',NULL,NULL,NULL,NULL,0),
(3737,1,'aasdas',NULL,NULL,NULL,NULL,0),
(3741,1,'12312',NULL,NULL,NULL,NULL,0),
(80,2,'Головна сторінка','<p>?</p>\n',NULL,NULL,'Відкрийте інноваційні можливості нашої демонстраційної платформи! ',0),
(330,2,'Увійти',NULL,'Вхід',NULL,NULL,0),
(3625,2,'Відновлення паролю',NULL,NULL,NULL,NULL,0),
(3675,2,'Особистий кабінет',NULL,NULL,NULL,NULL,0),
(3725,2,'Конструктор шаблонів',NULL,NULL,NULL,NULL,0),
(3727,2,'Тест1',NULL,NULL,NULL,NULL,0),
(3728,2,'Персональні дані',NULL,NULL,NULL,NULL,0),
(3729,2,'Вийти',NULL,NULL,NULL,NULL,0),
(3730,2,'Test feed11123',NULL,NULL,NULL,NULL,0),
(3732,2,'test5',NULL,NULL,NULL,NULL,0),
(3733,2,'test5',NULL,NULL,NULL,NULL,0),
(3734,2,'tttest',NULL,NULL,NULL,NULL,0),
(3737,2,'aasdas',NULL,NULL,NULL,NULL,0),
(3741,2,'123',NULL,NULL,NULL,NULL,0),
(80,3,'Main page',NULL,NULL,NULL,'Discover the innovative capabilities of our demo platform! ',0),
(330,3,'Enter',NULL,'Вход',NULL,NULL,0),
(3625,3,'Password restoration',NULL,NULL,NULL,NULL,0),
(3675,3,'Personal Area',NULL,NULL,NULL,NULL,0),
(3725,3,'Template builder',NULL,NULL,NULL,NULL,0),
(3727,3,'Test',NULL,NULL,NULL,NULL,0),
(3728,3,'Personal data',NULL,NULL,NULL,NULL,0),
(3729,3,'Log out',NULL,NULL,NULL,NULL,0),
(3730,3,'test2e',NULL,NULL,NULL,NULL,0),
(3732,3,'test5',NULL,NULL,NULL,NULL,0),
(3733,3,'test5',NULL,NULL,NULL,NULL,0),
(3734,3,'tttest',NULL,NULL,NULL,NULL,0),
(3737,3,'aasdas',NULL,NULL,NULL,NULL,0),
(3741,3,'123',NULL,NULL,NULL,NULL,0),
(80,4,'Hauptseite',NULL,NULL,NULL,'Entdecken Sie die innovativen Möglichkeiten unserer Demoplattform! ',0),
(330,4,'Enter',NULL,NULL,NULL,NULL,0),
(3625,4,'Passwortwiederherstellung',NULL,NULL,NULL,NULL,0),
(3675,4,'Persönliches Büro',NULL,NULL,NULL,NULL,0),
(3725,4,'Vorlagenersteller',NULL,NULL,NULL,NULL,0),
(3727,4,'Prüfen',NULL,NULL,NULL,NULL,0),
(3728,4,'Persönliche Daten',NULL,NULL,NULL,NULL,0),
(3729,4,'Abmelden',NULL,NULL,NULL,NULL,0),
(3730,4,'test2d',NULL,NULL,NULL,NULL,0),
(3732,4,'test5',NULL,NULL,NULL,NULL,0),
(3733,4,'test5',NULL,NULL,NULL,NULL,0),
(3734,4,'tttest',NULL,NULL,NULL,NULL,0),
(3737,4,'aasdas',NULL,NULL,NULL,NULL,0),
(3741,4,'555',NULL,NULL,NULL,NULL,0),
(80,5,'Главная страница',NULL,NULL,NULL,'Odkryj innowacyjne możliwości naszej platformy demonstracyjnej! ',0),
(330,5,'Войти',NULL,'Вход',NULL,NULL,0),
(3625,5,'Восстановление пароля',NULL,NULL,NULL,NULL,0),
(3675,5,'Obszar osobisty',NULL,NULL,NULL,NULL,0),
(3725,5,'Konstruktor szablonów',NULL,NULL,NULL,NULL,0),
(3727,5,'Test',NULL,NULL,NULL,NULL,0),
(3728,5,'Dane osobowe',NULL,NULL,NULL,NULL,0),
(3729,5,'Wyloguj się',NULL,NULL,NULL,NULL,0),
(3730,5,'test2p',NULL,NULL,NULL,NULL,0),
(3732,5,'test5',NULL,NULL,NULL,NULL,0),
(3733,5,'test5',NULL,NULL,NULL,NULL,0),
(3734,5,'tttest',NULL,NULL,NULL,NULL,0),
(3737,5,'aasdas',NULL,NULL,NULL,NULL,0),
(3741,5,'555',NULL,NULL,NULL,NULL,0),
(80,9,'Головна сторінка','<p>?</p>\n',NULL,NULL,'Відкрийте інноваційні можливості нашої демонстраційної платформи! ',0),
(330,9,'Увійти',NULL,'Вхід',NULL,NULL,0),
(3625,9,'Відновлення паролю',NULL,NULL,NULL,NULL,0),
(3675,9,'Особистий кабінет',NULL,NULL,NULL,NULL,0),
(3725,9,'Конструктор шаблонів',NULL,NULL,NULL,NULL,0),
(3727,9,'Тест1',NULL,NULL,NULL,NULL,0),
(3728,9,'Персональні дані',NULL,NULL,NULL,NULL,0),
(3729,9,'Вийти',NULL,NULL,NULL,NULL,0),
(3730,9,'Test feed1112',NULL,NULL,NULL,NULL,0),
(3732,9,'test5',NULL,NULL,NULL,NULL,0),
(3733,9,'test5',NULL,NULL,NULL,NULL,0),
(3734,9,'tttest',NULL,NULL,NULL,NULL,0),
(3737,9,'aasdas',NULL,NULL,NULL,NULL,0),
(3741,9,'123',NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `share_sitemap_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sitemap_uploads`
--

DROP TABLE IF EXISTS `share_sitemap_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sitemap_uploads` (
  `ssu_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `smap_id` int(10) unsigned DEFAULT NULL,
  `upl_id` int(10) unsigned NOT NULL,
  `ssu_order_num` int(10) unsigned NOT NULL DEFAULT 1,
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ssu_id`),
  KEY `upl_id` (`upl_id`),
  KEY `smap_id` (`smap_id`),
  KEY `session_id` (`session_id`),
  KEY `ssu_order_num_idx` (`ssu_order_num`),
  CONSTRAINT `share_sitemap_uploads_ibfk_1` FOREIGN KEY (`upl_id`) REFERENCES `share_uploads` (`upl_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_sitemap_uploads_ibfk_2` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sitemap_uploads`
--

LOCK TABLES `share_sitemap_uploads` WRITE;
/*!40000 ALTER TABLE `share_sitemap_uploads` DISABLE KEYS */;
INSERT INTO `share_sitemap_uploads` VALUES
(18,3730,32073,32073,'fa2adee9f5c504b96b13f3b8ca70c5ef');
/*!40000 ALTER TABLE `share_sitemap_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sites`
--

DROP TABLE IF EXISTS `share_sites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sites` (
  `site_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `site_is_active` tinyint(1) NOT NULL DEFAULT 1,
  `site_is_indexed` tinyint(1) NOT NULL DEFAULT 1,
  `site_is_default` tinyint(1) NOT NULL DEFAULT 0,
  `site_folder` char(20) NOT NULL DEFAULT 'default',
  `site_order_num` int(10) unsigned DEFAULT 1,
  `site_meta_robots` text DEFAULT NULL,
  `site_ga_code` text DEFAULT NULL,
  PRIMARY KEY (`site_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sites`
--

LOCK TABLES `share_sites` WRITE;
/*!40000 ALTER TABLE `share_sites` DISABLE KEYS */;
INSERT INTO `share_sites` VALUES
(1,1,1,1,'default',2,NULL,NULL);
/*!40000 ALTER TABLE `share_sites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sites_properties`
--

DROP TABLE IF EXISTS `share_sites_properties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sites_properties` (
  `prop_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `site_id` int(10) unsigned DEFAULT NULL,
  `prop_is_default` tinyint(1) NOT NULL DEFAULT 0,
  `prop_name` varchar(255) NOT NULL,
  `prop_value` text NOT NULL,
  PRIMARY KEY (`prop_id`),
  UNIQUE KEY `site_id` (`site_id`,`prop_name`),
  CONSTRAINT `share_sites_properties_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `share_sites` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sites_properties`
--

LOCK TABLES `share_sites_properties` WRITE;
/*!40000 ALTER TABLE `share_sites_properties` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_sites_properties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sites_tags`
--

DROP TABLE IF EXISTS `share_sites_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sites_tags` (
  `site_id` int(10) unsigned NOT NULL,
  `tag_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`site_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `share_sites_tags_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_sites_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `share_tags` (`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sites_tags`
--

LOCK TABLES `share_sites_tags` WRITE;
/*!40000 ALTER TABLE `share_sites_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `share_sites_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_sites_translation`
--

DROP TABLE IF EXISTS `share_sites_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_sites_translation` (
  `site_id` int(11) unsigned NOT NULL,
  `lang_id` int(11) unsigned NOT NULL,
  `site_name` char(200) NOT NULL,
  `site_meta_keywords` text DEFAULT NULL,
  `site_meta_description` text DEFAULT NULL,
  PRIMARY KEY (`site_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `share_sites_translation_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `share_sites` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_sites_translation_ibfk_2` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_sites_translation`
--

LOCK TABLES `share_sites_translation` WRITE;
/*!40000 ALTER TABLE `share_sites_translation` DISABLE KEYS */;
INSERT INTO `share_sites_translation` VALUES
(1,1,'Energine',NULL,NULL),
(1,2,'Energine',NULL,NULL),
(1,3,'Energine',NULL,NULL),
(1,4,'Energine',NULL,NULL),
(1,5,'Energine',NULL,NULL),
(1,9,'Energine',NULL,NULL);
/*!40000 ALTER TABLE `share_sites_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_tags`
--

DROP TABLE IF EXISTS `share_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_tags` (
  `tag_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tag_code` char(100) NOT NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `tag_code` (`tag_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_tags`
--

LOCK TABLES `share_tags` WRITE;
/*!40000 ALTER TABLE `share_tags` DISABLE KEYS */;
INSERT INTO `share_tags` VALUES
(7,'aaaa'),
(6,'fo'),
(4,'foo'),
(3,'footer'),
(1,'menu'),
(5,'test'),
(2,'user');
/*!40000 ALTER TABLE `share_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_tags_translation`
--

DROP TABLE IF EXISTS `share_tags_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_tags_translation` (
  `tag_id` int(11) unsigned NOT NULL,
  `lang_id` int(11) unsigned NOT NULL,
  `tag_name` char(100) NOT NULL,
  PRIMARY KEY (`tag_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `share_tags_translation_ibfk_1` FOREIGN KEY (`tag_id`) REFERENCES `share_tags` (`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_tags_translation_ibfk_2` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_tags_translation`
--

LOCK TABLES `share_tags_translation` WRITE;
/*!40000 ALTER TABLE `share_tags_translation` DISABLE KEYS */;
INSERT INTO `share_tags_translation` VALUES
(1,1,'menu'),
(1,2,'menu'),
(1,3,'menu'),
(1,4,'menu'),
(1,5,'menu'),
(1,9,'menu'),
(2,1,'user'),
(2,2,'user'),
(2,3,'user'),
(2,4,'user'),
(2,5,'user'),
(2,9,'user'),
(3,1,'footer'),
(3,2,'footer'),
(3,3,'footer'),
(3,4,'footer'),
(3,5,'footer'),
(3,9,'footer'),
(4,1,'foo'),
(4,2,'foo'),
(4,3,'foo'),
(4,4,'foo'),
(4,5,'foo'),
(4,9,'foo'),
(5,1,'test'),
(5,2,'test'),
(5,3,'test'),
(5,4,'test'),
(5,5,'test'),
(5,9,'test'),
(6,1,'fo'),
(6,2,'fo'),
(6,3,'fo'),
(6,4,'fo'),
(6,5,'fo'),
(6,9,'fo'),
(7,1,'aaa'),
(7,2,'aaa'),
(7,3,'aaa'),
(7,4,'aaa'),
(7,5,'aaa'),
(7,9,'aaa');
/*!40000 ALTER TABLE `share_tags_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_textblocks`
--

DROP TABLE IF EXISTS `share_textblocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_textblocks` (
  `tb_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `smap_id` int(10) unsigned DEFAULT NULL,
  `tb_num` char(50) NOT NULL DEFAULT '1',
  PRIMARY KEY (`tb_id`),
  UNIQUE KEY `smap_id` (`smap_id`,`tb_num`),
  CONSTRAINT `share_textblocks_ibfk_1` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_textblocks`
--

LOCK TABLES `share_textblocks` WRITE;
/*!40000 ALTER TABLE `share_textblocks` DISABLE KEYS */;
INSERT INTO `share_textblocks` VALUES
(1,NULL,'footerTextBlock'),
(10,80,'1'),
(14,330,'1'),
(12,3730,'1'),
(13,3737,'1'),
(16,3741,'1'),
(17,3741,'2');
/*!40000 ALTER TABLE `share_textblocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_textblocks_translation`
--

DROP TABLE IF EXISTS `share_textblocks_translation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_textblocks_translation` (
  `tb_id` int(10) unsigned NOT NULL,
  `lang_id` int(10) unsigned NOT NULL,
  `tb_content` longtext NOT NULL,
  UNIQUE KEY `tb_id` (`tb_id`,`lang_id`),
  KEY `lang_id` (`lang_id`),
  CONSTRAINT `share_textblocks_translation_ibfk_1` FOREIGN KEY (`tb_id`) REFERENCES `share_textblocks` (`tb_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `share_textblocks_translation_ibfk_2` FOREIGN KEY (`lang_id`) REFERENCES `share_languages` (`lang_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_textblocks_translation`
--

LOCK TABLES `share_textblocks_translation` WRITE;
/*!40000 ALTER TABLE `share_textblocks_translation` DISABLE KEYS */;
INSERT INTO `share_textblocks_translation` VALUES
(1,2,'<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt distinctio earum repellat quaerat voluptatibus placeat nam, commodi optio pariatur est quia magnam eum harum corrupti dicta, aliquam sequi voluptate quas.22225555112222</p>\n'),
(1,3,'<p>123</p>\n'),
(1,9,'<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt distinctio earum repellat quaerat voluptatibus placeat nam, commodi optio pariatur est quia magnam eum harum corrupti dicta, aliquam sequi voluptate quas.</p>\n'),
(10,2,'<p style=\"text-align:justify;\">3213232132213212231133312351</p>\n\n<p style=\"text-align:justify;\">12312334512</p>\n\n<p style=\"text-align:justify;\"> </p>\n\n<p style=\"text-align:justify;\"><img alt=\"shini.png\" border=\"0\" height=\"433\" src=\"uploads/public/gallery/17607781644989.png\" width=\"640\" /></p>\n\n<p> </p>\n\n<p><img alt=\"shini.png\" src=\"uploads/public/gallery/17607781644989.png\" style=\"border-width:0px;border-style:solid;width:100%;\" /></p>\n\n<p> </p>\n\n<p> </p>\n\n<p class=\"underline\">as</p>\n\n<h3> </h3>\n\n<p>апр</p>\n\n<p> 1</p>\n\n<p> </p>\n\n<p> 11</p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p>222</p>\n\n<p> </p>\n'),
(10,3,'<p>-- asasasa1</p>\n\n<p> </p>\n'),
(10,9,'<p>1223<a href=\"uploads/public/gallery/17508596121248.jpg\">11333</a>1</p>\n\n<p>222</p>\n'),
(12,2,'<p>23456789101</p>\n\n<p>1</p>\n'),
(12,9,'<p>12345678910</p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n\n<p> </p>\n'),
(13,2,'<p>1235555</p>\n'),
(13,9,'<p>123</p>\n'),
(14,2,'<p>123</p>\n'),
(14,9,'<p>123</p>\n'),
(16,2,'<p>asdadasdasda</p>\n'),
(16,9,'<p>asdadasdasda</p>\n'),
(17,2,'<p>222</p>\n');
/*!40000 ALTER TABLE `share_textblocks_translation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `share_uploads`
--

DROP TABLE IF EXISTS `share_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `share_uploads` (
  `upl_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `upl_pid` int(10) unsigned DEFAULT NULL COMMENT 'родительский идентификатор',
  `upl_childs_count` int(10) unsigned DEFAULT NULL COMMENT 'количество наследников, 0 - могут быть[но сейчас нет, пустая папка ], NULL - не может быть вообще',
  `upl_path` varchar(250) NOT NULL COMMENT 'уникальный полный путь к файлу',
  `upl_filename` varchar(255) NOT NULL COMMENT 'реальное имя файла',
  `upl_name` varchar(250) NOT NULL COMMENT 'имя файла с расширением, с этим именем файл отдается при скачивании',
  `upl_title` varchar(250) NOT NULL DEFAULT '' COMMENT 'то как файл выводится в репозитории и в alt-ах',
  `upl_description` text DEFAULT NULL,
  `upl_publication_date` datetime DEFAULT NULL,
  `upl_data` text DEFAULT NULL,
  `upl_views` bigint(20) NOT NULL DEFAULT 0,
  `upl_internal_type` char(20) DEFAULT NULL,
  `upl_mime_type` char(50) DEFAULT NULL,
  `upl_is_mp4` tinyint(1) NOT NULL DEFAULT 0,
  `upl_is_webm` tinyint(1) NOT NULL DEFAULT 0,
  `upl_is_flv` tinyint(1) NOT NULL DEFAULT 0,
  `upl_width` int(10) unsigned DEFAULT NULL,
  `upl_height` int(10) unsigned DEFAULT NULL,
  `upl_is_ready` tinyint(1) DEFAULT 1,
  `upl_duration` time DEFAULT NULL,
  `upl_is_active` int(10) unsigned DEFAULT 1,
  PRIMARY KEY (`upl_id`),
  UNIQUE KEY `upl_path` (`upl_path`),
  KEY `upl_views` (`upl_views`),
  KEY `upl_is_ready` (`upl_is_ready`),
  KEY `upl_publication_date_index` (`upl_publication_date`),
  KEY `abc` (`upl_id`,`upl_is_ready`,`upl_views`),
  KEY `upl_pid` (`upl_pid`),
  KEY `upl_childs_count` (`upl_childs_count`),
  KEY `upl_filename` (`upl_filename`),
  KEY `upl_is_active` (`upl_is_active`),
  KEY `upl_is_mp4` (`upl_is_mp4`),
  KEY `upl_is_webm` (`upl_is_webm`),
  KEY `upl_is_flv` (`upl_is_flv`),
  CONSTRAINT `share_uploads_ibfk_1` FOREIGN KEY (`upl_pid`) REFERENCES `share_uploads` (`upl_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32074 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `share_uploads`
--

LOCK TABLES `share_uploads` WRITE;
/*!40000 ALTER TABLE `share_uploads` DISABLE KEYS */;
INSERT INTO `share_uploads` VALUES
(1,NULL,0,'uploads/public','public','public','Локальный репозиторий',NULL,'2025-10-29 07:52:05',NULL,0,'repo','repo/local',0,0,0,NULL,NULL,1,NULL,1),
(14,1,NULL,'uploads/public/gallery','gallery','gallery','Gallery',NULL,'2025-10-18 12:02:44',NULL,0,'folder','unknown/mime-type',0,0,0,NULL,NULL,1,NULL,1),
(19,1,NULL,'uploads/public/fast-upload','fast-upload','fast-upload','Fast Upload',NULL,'2025-10-29 07:52:05',NULL,0,'folder','unknown/mime-type',0,0,0,NULL,NULL,1,NULL,1),
(31906,14,NULL,'uploads/public/gallery/17507988994340.webp','17507988994340.webp','credit1.webp','credit1.webp',NULL,'2025-06-25 00:01:39',NULL,0,'image','image/webp',0,0,0,750,400,1,NULL,1),
(31908,14,NULL,'uploads/public/gallery/1750798900316.webp','1750798900316.webp','volos1.webp','volos1.webp',NULL,'2025-06-25 00:01:40',NULL,0,'image','image/webp',0,0,0,4284,5712,1,NULL,1),
(31909,14,NULL,'uploads/public/gallery/17507989004361.jpg','17507989004361.jpg','volos2.jpg','volos2.jpg',NULL,'2025-06-25 00:01:40',NULL,0,'image','image/jpeg',0,0,0,1500,2000,1,NULL,1),
(31910,14,NULL,'uploads/public/gallery/17507989008397.webp','17507989008397.webp','volos2.webp','volos2.webp',NULL,'2025-06-25 00:01:40',NULL,0,'image','image/webp',0,0,0,4284,5712,1,NULL,1),
(31911,14,NULL,'uploads/public/gallery/17507989007413.jpg','17507989007413.jpg','1200_0_1594888197-5282.jpg','1200_0_1594888197-5282.jpg',NULL,'2025-06-25 00:01:40',NULL,0,'image','image/jpeg',0,0,0,1200,788,1,NULL,1),
(31912,14,NULL,'uploads/public/gallery/17507989006454.webp','17507989006454.webp','1200_0_1594888197-5282.webp','1200_0_1594888197-5282.webp',NULL,'2025-06-25 00:01:40',NULL,0,'image','image/webp',0,0,0,1200,788,1,NULL,1),
(31913,14,NULL,'uploads/public/gallery/1750798901955.png','1750798901955.png','0909-na-chasah-1024x579-1.png','0909-na-chasah-1024x579-1.png',NULL,'2025-06-25 00:01:41',NULL,0,'image','image/png',0,0,0,1024,579,1,NULL,1),
(31914,14,NULL,'uploads/public/gallery/17507989019021.jpeg','17507989019021.jpeg','02ecbe13-60ea-11ed-80e4-e9208f0c9a67_2.jpeg','02ecbe13-60ea-11ed-80e4-e9208f0c9a67_2.jpeg',NULL,'2025-06-25 00:01:41',NULL,0,'image','image/jpeg',0,0,0,660,360,1,NULL,1),
(31915,14,NULL,'uploads/public/gallery/17507989015905.jpg','17507989015905.jpg','098089137770980833777190.jpg','098089137770980833777190.jpg',NULL,'2025-06-25 00:01:41',NULL,0,'image','image/jpeg',0,0,0,1200,630,1,NULL,1),
(31916,14,NULL,'uploads/public/gallery/17507989019623.jpg','17507989019623.jpg','1696175556402 (3).jpg','1696175556402 (3).jpg',NULL,'2025-06-25 00:01:41',NULL,0,'image','image/jpeg',0,0,0,800,600,1,NULL,1),
(31917,14,NULL,'uploads/public/gallery/17507989015687.jpg','17507989015687.jpg','1696175556402.jpg','1696175556402.jpg',NULL,'2025-06-25 00:01:41',NULL,0,'image','image/jpeg',0,0,0,800,600,1,NULL,1),
(31918,14,NULL,'uploads/public/gallery/17507989014246.jpg','17507989014246.jpg','1680008393-design-pibig-info-p-razdvizhnie-peregorodki-v-interere-dizain-1-1.jpg','1680008393-design-pibig-info-p-razdvizhnie-peregorodki-v-interere-dizain-1-1.jpg',NULL,'2025-06-25 00:01:41',NULL,0,'image','image/jpeg',0,0,0,900,750,1,NULL,1),
(31920,14,NULL,'uploads/public/gallery/17507989029297.jpg','17507989029297.jpg','1678996461_design-pibig-info-p-kaminnii-portal-v-stile-loft-dizain-instag-1.jpg','1678996461_design-pibig-info-p-kaminnii-portal-v-stile-loft-dizain-instag-1.jpg',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/jpeg',0,0,0,1170,780,1,NULL,1),
(31921,14,NULL,'uploads/public/gallery/1750798902672.jpg','1750798902672.jpg','15bd3f2d982b899446ea1ebeddbc2841.jpg','15bd3f2d982b899446ea1ebeddbc2841.jpg',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/jpeg',0,0,0,478,479,1,NULL,1),
(31922,14,NULL,'uploads/public/gallery/17507989025298.webp','17507989025298.webp','15bd3f2d982b899446ea1ebeddbc2841.webp','15bd3f2d982b899446ea1ebeddbc2841.webp',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/webp',0,0,0,478,479,1,NULL,1),
(31923,14,NULL,'uploads/public/gallery/17507989024342.jpg','17507989024342.jpg','111.jpg','111.jpg',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/jpeg',0,0,0,1200,800,1,NULL,1),
(31924,14,NULL,'uploads/public/gallery/17507989028844.jpg','17507989028844.jpg','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.jpg','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.jpg',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/jpeg',0,0,0,400,400,1,NULL,1),
(31925,14,NULL,'uploads/public/gallery/17507989025072.webp','17507989025072.webp','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.webp','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.webp',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/webp',0,0,0,400,400,1,NULL,1),
(31926,14,NULL,'uploads/public/gallery/17507989023166.jpg','17507989023166.jpg','bilizna1.jpg','bilizna1.jpg',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/jpeg',0,0,0,690,460,1,NULL,1),
(31927,14,NULL,'uploads/public/gallery/17507989025853.jpg','17507989025853.jpg','bilizna2.jpg','bilizna2.jpg',NULL,'2025-06-25 00:01:42',NULL,0,'image','image/jpeg',0,0,0,687,460,1,NULL,1),
(31928,14,NULL,'uploads/public/gallery/17507989038430.jpg','17507989038430.jpg','bilizna3.jpg','bilizna3.jpg',NULL,'2025-06-25 00:01:43',NULL,0,'image','image/jpeg',0,0,0,688,459,1,NULL,1),
(31929,14,NULL,'uploads/public/gallery/17507989039805.jpg','17507989039805.jpg','den1.jpg','den1.jpg',NULL,'2025-06-25 00:01:43',NULL,0,'image','image/jpeg',0,0,0,1000,1000,1,NULL,1),
(31930,14,NULL,'uploads/public/gallery/17507989035194.jpg','17507989035194.jpg','1677766328_happyhouse-guru-p-samokleyushchiisya-dekor-dlya-sten-stena-i-2.jpg','1677766328_happyhouse-guru-p-samokleyushchiisya-dekor-dlya-sten-stena-i-2.jpg',NULL,'2025-06-25 00:01:43',NULL,0,'image','image/jpeg',0,0,0,940,940,1,NULL,1),
(31931,14,NULL,'uploads/public/gallery/17507989306510.jpg','17507989306510.jpg','volos1.jpg','volos1.jpg',NULL,'2025-06-25 00:02:10',NULL,0,'image','image/jpeg',0,0,0,1500,2000,1,NULL,1),
(31932,14,NULL,'uploads/public/gallery/17507989306532.webp','17507989306532.webp','volos1.webp','volos1.webp',NULL,'2025-06-25 00:02:10',NULL,0,'image','image/webp',0,0,0,4284,5712,1,NULL,1),
(31933,14,NULL,'uploads/public/gallery/17507989303230.jpg','17507989303230.jpg','volos2.jpg','volos2.jpg',NULL,'2025-06-25 00:02:10',NULL,0,'image','image/jpeg',0,0,0,1500,2000,1,NULL,1),
(31934,14,NULL,'uploads/public/gallery/17507989314188.webp','17507989314188.webp','volos2.webp','volos2.webp',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/webp',0,0,0,4284,5712,1,NULL,1),
(31935,14,NULL,'uploads/public/gallery/17507989316836.jpg','17507989316836.jpg','1200_0_1594888197-5282.jpg','1200_0_1594888197-5282.jpg',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/jpeg',0,0,0,1200,788,1,NULL,1),
(31936,14,NULL,'uploads/public/gallery/17507989319263.webp','17507989319263.webp','1200_0_1594888197-5282.webp','1200_0_1594888197-5282.webp',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/webp',0,0,0,1200,788,1,NULL,1),
(31937,14,NULL,'uploads/public/gallery/17507989313199.png','17507989313199.png','0909-na-chasah-1024x579-1.png','0909-na-chasah-1024x579-1.png',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/png',0,0,0,1024,579,1,NULL,1),
(31938,14,NULL,'uploads/public/gallery/17507989316027.jpeg','17507989316027.jpeg','02ecbe13-60ea-11ed-80e4-e9208f0c9a67_2.jpeg','02ecbe13-60ea-11ed-80e4-e9208f0c9a67_2.jpeg',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/jpeg',0,0,0,660,360,1,NULL,1),
(31939,14,NULL,'uploads/public/gallery/17507989315059.jpg','17507989315059.jpg','098089137770980833777190.jpg','098089137770980833777190.jpg',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/jpeg',0,0,0,1200,630,1,NULL,1),
(31940,14,NULL,'uploads/public/gallery/1750798931780.jpg','1750798931780.jpg','1696175556402 (3).jpg','1696175556402 (3).jpg',NULL,'2025-06-25 00:02:11',NULL,0,'image','image/jpeg',0,0,0,800,600,1,NULL,1),
(31941,14,NULL,'uploads/public/gallery/1750798932207.jpg','1750798932207.jpg','1696175556402.jpg','1696175556402.jpg',NULL,'2025-06-25 00:02:12',NULL,0,'image','image/jpeg',0,0,0,800,600,1,NULL,1),
(31942,14,NULL,'uploads/public/gallery/17507989323541.jpg','17507989323541.jpg','1680008393-design-pibig-info-p-razdvizhnie-peregorodki-v-interere-dizain-1-1.jpg','1680008393-design-pibig-info-p-razdvizhnie-peregorodki-v-interere-dizain-1-1.jpg',NULL,'2025-06-25 00:02:12',NULL,0,'image','image/jpeg',0,0,0,900,750,1,NULL,1),
(31943,14,NULL,'uploads/public/gallery/1750798932317.png','1750798932317.png','15bd3f2d982b899446ea1ebeddbc2841.png','15bd3f2d982b899446ea1ebeddbc2841.png',NULL,'2025-06-25 00:02:12',NULL,0,'image','image/png',0,0,0,478,479,1,NULL,1),
(31944,14,NULL,'uploads/public/gallery/17507989326616.jpg','17507989326616.jpg','1678996461_design-pibig-info-p-kaminnii-portal-v-stile-loft-dizain-instag-1.jpg','1678996461_design-pibig-info-p-kaminnii-portal-v-stile-loft-dizain-instag-1.jpg',NULL,'2025-06-25 00:02:12',NULL,0,'image','image/jpeg',0,0,0,1170,780,1,NULL,1),
(31945,14,NULL,'uploads/public/gallery/17507989324112.jpg','17507989324112.jpg','15bd3f2d982b899446ea1ebeddbc2841.jpg','15bd3f2d982b899446ea1ebeddbc2841.jpg',NULL,'2025-06-25 00:02:12',NULL,0,'image','image/jpeg',0,0,0,478,479,1,NULL,1),
(31946,14,NULL,'uploads/public/gallery/17507989324946.webp','17507989324946.webp','15bd3f2d982b899446ea1ebeddbc2841.webp','15bd3f2d982b899446ea1ebeddbc2841.webp',NULL,'2025-06-25 00:02:12',NULL,0,'image','image/webp',0,0,0,478,479,1,NULL,1),
(31947,14,NULL,'uploads/public/gallery/17507989337014.jpg','17507989337014.jpg','111.jpg','111.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,1200,800,1,NULL,1),
(31948,14,NULL,'uploads/public/gallery/17507989337744.jpg','17507989337744.jpg','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.jpg','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,400,400,1,NULL,1),
(31949,14,NULL,'uploads/public/gallery/17507989337865.webp','17507989337865.webp','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.webp','c0e6f7bd-68ee-4360-85ae-48608a14ec13-400x400.webp',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/webp',0,0,0,400,400,1,NULL,1),
(31950,14,NULL,'uploads/public/gallery/17507989339139.jpg','17507989339139.jpg','bilizna1.jpg','bilizna1.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,690,460,1,NULL,1),
(31951,14,NULL,'uploads/public/gallery/17507989336434.jpg','17507989336434.jpg','bilizna2.jpg','bilizna2.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,687,460,1,NULL,1),
(31952,14,NULL,'uploads/public/gallery/17507989339691.jpg','17507989339691.jpg','bilizna3.jpg','bilizna3.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,688,459,1,NULL,1),
(31953,14,NULL,'uploads/public/gallery/17507989333042.jpg','17507989333042.jpg','den1.jpg','den1.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,1000,1000,1,NULL,1),
(31954,14,NULL,'uploads/public/gallery/1750798933640.jpg','1750798933640.jpg','1677766328_happyhouse-guru-p-samokleyushchiisya-dekor-dlya-sten-stena-i-2.jpg','1677766328_happyhouse-guru-p-samokleyushchiisya-dekor-dlya-sten-stena-i-2.jpg',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/jpeg',0,0,0,940,940,1,NULL,1),
(31955,14,NULL,'uploads/public/gallery/17507989335982.webp','17507989335982.webp','credit1.webp','credit1.webp',NULL,'2025-06-25 00:02:13',NULL,0,'image','image/webp',0,0,0,750,400,1,NULL,1),
(31957,14,NULL,'uploads/public/gallery/17508557971897.webp','17508557971897.webp','credit1.webp','credit1.webp',NULL,'2025-06-25 15:49:57',NULL,0,'image','image/webp',0,0,0,750,400,1,NULL,1),
(31958,14,NULL,'uploads/public/gallery/17508558081033.jpg','17508558081033.jpg','volos1.jpg','volos1.jpg',NULL,'2025-06-25 15:50:08',NULL,0,'image','image/jpeg',0,0,0,1500,2000,1,NULL,1),
(31959,14,NULL,'uploads/public/gallery/17508573575077.webp','17508573575077.webp','credit1.webp','credit1.webp',NULL,'2025-06-25 16:15:57',NULL,0,'image','image/webp',0,0,0,750,400,1,NULL,1),
(31998,14,NULL,'uploads/public/gallery/17508589874176.jpg','17508589874176.jpg','den1.jpg','den1.jpg',NULL,'2025-06-25 16:43:07',NULL,0,'image','image/jpeg',0,0,0,1000,1000,1,NULL,1),
(31999,14,NULL,'uploads/public/gallery/17508595108150.jpg','17508595108150.jpg','den1.jpg','den1.jpg',NULL,'2025-06-25 16:51:50',NULL,0,'image','image/jpeg',0,0,0,1000,1000,1,NULL,1),
(32002,14,NULL,'uploads/public/gallery/17508595984643.jpg','17508595984643.jpg','den2.jpg','den2.jpg',NULL,'2025-06-25 16:53:18',NULL,0,'image','image/jpeg',0,0,0,480,320,1,NULL,1),
(32003,14,NULL,'uploads/public/gallery/17508596037520.jpg','17508596037520.jpg','den1.jpg','den1.jpg',NULL,'2025-06-25 16:53:23',NULL,0,'image','image/jpeg',0,0,0,1000,1000,1,NULL,1),
(32004,14,NULL,'uploads/public/gallery/17508596039881.jpg','17508596039881.jpg','den2.jpg','den2.jpg',NULL,'2025-06-25 16:53:23',NULL,0,'image','image/jpeg',0,0,0,480,320,1,NULL,1),
(32005,14,NULL,'uploads/public/gallery/17508596037021.png','17508596037021.png','den3.png','den3.png',NULL,'2025-06-25 16:53:23',NULL,0,'image','image/png',0,0,0,700,500,1,NULL,1),
(32006,14,NULL,'uploads/public/gallery/17508596114957.jpg','17508596114957.jpg','den1.jpg','den1.jpg',NULL,'2025-06-25 16:53:31',NULL,0,'image','image/jpeg',0,0,0,1000,1000,1,NULL,1),
(32007,14,NULL,'uploads/public/gallery/1750859611573.jpg','1750859611573.jpg','den2.jpg','den2.jpg',NULL,'2025-06-25 16:53:31',NULL,0,'image','image/jpeg',0,0,0,480,320,1,NULL,1),
(32009,14,NULL,'uploads/public/gallery/17508596121248.jpg','17508596121248.jpg','den4.jpg','den4.jpg',NULL,'2025-06-25 16:53:32',NULL,0,'image','image/jpeg',0,0,0,1280,720,1,NULL,1),
(32055,14,NULL,'uploads/public/gallery/17578256626468.jpg','17578256626468.jpg','5287567700652059274.jpg','5287567700652059274.jpg',NULL,'2025-09-14 07:54:22',NULL,0,'image','image/jpeg',0,0,0,1280,960,1,NULL,1),
(32068,14,NULL,'uploads/public/gallery/17607781644989.png','17607781644989.png','shini.png','shini.png',NULL,'2025-10-18 12:02:44',NULL,0,'image','image/png',0,0,0,640,433,1,NULL,1),
(32070,19,NULL,'uploads/public/fast-upload/17615037765974.jpg','17615037765974.jpg','68fa26693a903.jpg','68fa26693a903.jpg',NULL,'2025-10-26 20:36:16',NULL,0,'image','image/jpeg',0,0,0,1766,1012,1,NULL,1),
(32071,19,NULL,'uploads/public/fast-upload/17615038006241.jpg','17615038006241.jpg','selection2.jpg','selection2.jpg',NULL,'2025-10-26 20:36:40',NULL,0,'image','image/jpeg',0,0,0,602,412,1,NULL,1),
(32072,19,NULL,'uploads/public/fast-upload/17616808504696.jpg','17616808504696.jpg','0070592.jpg','0070592',NULL,'2025-10-28 21:47:30',NULL,0,'image','image/jpeg',0,0,0,800,560,1,NULL,1),
(32073,19,NULL,'uploads/public/fast-upload/17617171257326.jpg','17617171257326.jpg','5323523285658496133.jpg','5323523285658496133.jpg',NULL,'2025-10-29 07:52:05',NULL,0,'image','image/jpeg',0,0,0,1280,960,1,NULL,1);
/*!40000 ALTER TABLE `share_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_gallery`
--

DROP TABLE IF EXISTS `site_gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_gallery` (
  `gallery_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `smap_id` int(10) unsigned NOT NULL,
  `gallery_img` varchar(255) NOT NULL,
  `gallery_order_num` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`gallery_id`),
  KEY `smap_id` (`smap_id`),
  CONSTRAINT `site_gallery_ibfk_1` FOREIGN KEY (`smap_id`) REFERENCES `share_sitemap` (`smap_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=272 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_hungarian_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_gallery`
--

LOCK TABLES `site_gallery` WRITE;
/*!40000 ALTER TABLE `site_gallery` DISABLE KEYS */;
INSERT INTO `site_gallery` VALUES
(1,3734,'',1),
(2,3734,'',2);
/*!40000 ALTER TABLE `site_gallery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_generator`
--

DROP TABLE IF EXISTS `site_generator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_generator` (
  `sg_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sg_is_disabled` tinyint(1) NOT NULL DEFAULT 1,
  `sg_type` varchar(255) NOT NULL,
  `sg_title` varchar(255) NOT NULL,
  `sg_tablename` varchar(255) NOT NULL,
  `sg_template_name` varchar(255) NOT NULL,
  `sg_class_name` varchar(255) NOT NULL,
  `sg_fields` text NOT NULL,
  `sg_fields_tr` text DEFAULT NULL,
  `sg_is_filter` tinyint(1) NOT NULL DEFAULT 1,
  `sg_is_translation` tinyint(1) NOT NULL DEFAULT 1,
  `sg_is_uploads` tinyint(1) NOT NULL DEFAULT 1,
  `sg_is_js` tinyint(1) NOT NULL DEFAULT 1,
  `sg_date` datetime DEFAULT NULL,
  `sg_build_date` datetime DEFAULT NULL,
  PRIMARY KEY (`sg_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_generator`
--

LOCK TABLES `site_generator` WRITE;
/*!40000 ALTER TABLE `site_generator` DISABLE KEYS */;
INSERT INTO `site_generator` VALUES
(12,0,'1','test','test','test','Test','test_img\ntest_date\ntest_datetime\ntest_rtf\ntest_text','test_name',1,1,1,1,'2024-11-05 20:15:40','2024-11-05 00:49:10'),
(13,0,'2','Testfeed','Testfeed','Testfeed','Testfeed','test_img\ntest_date\ntest_datetime\ntest_rtf\ntest_text','test_name',1,1,1,0,'2025-09-01 00:33:58','2025-06-24 00:18:05');
/*!40000 ALTER TABLE `site_generator` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_group_rights`
--

DROP TABLE IF EXISTS `user_group_rights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_group_rights` (
  `right_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `right_name` char(20) NOT NULL,
  `right_const` char(20) NOT NULL,
  PRIMARY KEY (`right_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_group_rights`
--

LOCK TABLES `user_group_rights` WRITE;
/*!40000 ALTER TABLE `user_group_rights` DISABLE KEYS */;
INSERT INTO `user_group_rights` VALUES
(1,'Read only','ACCESS_READ'),
(2,'Edit','ACCESS_EDIT'),
(3,'Full control','ACCESS_FULL');
/*!40000 ALTER TABLE `user_group_rights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_groups`
--

DROP TABLE IF EXISTS `user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_groups` (
  `group_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` char(50) NOT NULL DEFAULT '',
  `group_default` tinyint(1) DEFAULT 0,
  `group_user_default` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`group_id`),
  KEY `group_default` (`group_default`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_groups`
--

LOCK TABLES `user_groups` WRITE;
/*!40000 ALTER TABLE `user_groups` DISABLE KEYS */;
INSERT INTO `user_groups` VALUES
(1,'Администратор',0,0),
(3,'Гость',1,0),
(4,'Пользователь',0,1);
/*!40000 ALTER TABLE `user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_user_groups`
--

DROP TABLE IF EXISTS `user_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_user_groups` (
  `u_id` int(10) unsigned NOT NULL,
  `group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`u_id`,`group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `user_user_groups_ibfk_1` FOREIGN KEY (`u_id`) REFERENCES `user_users` (`u_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `user_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_user_groups`
--

LOCK TABLES `user_user_groups` WRITE;
/*!40000 ALTER TABLE `user_user_groups` DISABLE KEYS */;
INSERT INTO `user_user_groups` VALUES
(22,1),
(1656,1),
(1658,1);
/*!40000 ALTER TABLE `user_user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_users`
--

DROP TABLE IF EXISTS `user_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_users` (
  `u_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `u_name` varchar(50) NOT NULL,
  `u_password` varchar(255) NOT NULL,
  `u_is_active` tinyint(1) NOT NULL DEFAULT 1,
  `u_fullname` varchar(250) DEFAULT NULL,
  `u_recovery_code` varchar(255) DEFAULT NULL,
  `u_recovery_date` datetime DEFAULT NULL,
  PRIMARY KEY (`u_id`),
  UNIQUE KEY `u_login` (`u_name`)
) ENGINE=InnoDB AUTO_INCREMENT=1664 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_users`
--

LOCK TABLES `user_users` WRITE;
/*!40000 ALTER TABLE `user_users` DISABLE KEYS */;
INSERT INTO `user_users` VALUES
(22,'demo@energine.org','$2y$12$ryGa7S6jXDyB8HLY.l73qe99CZTuMdcKNG0uM72H7ZGy8Tju5dl/.',1,'Admin123','672d370f6094a672d370f6094c','2024-11-08 23:54:23'),
(1656,'a@starter.ooo','91fa2f1978c8d41f69e5dccdb4ab9091c45670f8',1,'a',NULL,NULL),
(1658,'vitaly.yuzvishen@gmail.com','$2y$12$7ETDIMlVWb5ufWEjlF8ROOA3AldBMRlSqMRCEfn.30JYWQa4ZVCy.',1,'Vitaly Yuzvishen','685a0d1f9820b685a0d1f9820d','2025-06-25 05:27:43');
/*!40000 ALTER TABLE `user_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'c1phpbase'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_upl_parent` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `get_upl_parent`(`in_id` INT(10) UNSIGNED) RETURNS int(10) unsigned
    READS SQL DATA
RETURN (select ifnull(`upl_pid`, 0) from `share_uploads` where `upl_id` = in_id) ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_get_upl_pid_list` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_get_upl_pid_list`(IN `in_id` INT(10) UNSIGNED)
    MODIFIES SQL DATA
BEGIN
    create temporary table if not exists temp (id int(10) UNSIGNED, title varchar(255)) DEFAULT CHARSET=utf8;
    set @_pid = in_id;

    while @_pid > 0 do
    insert into `temp` select upl_id, upl_title from `share_uploads` where upl_id = @_pid;
    set @_pid = get_upl_parent(@_pid);
    end while;
    select * from `temp`;
    drop table if exists `temp`;
  END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `proc_update_dir_date` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_update_dir_date`(IN `in_id` INT UNSIGNED, IN `in_date` DATETIME)
    MODIFIES SQL DATA
BEGIN
	set @_pid = get_upl_parent(in_id);

    while @_pid > 0 do
	update share_uploads set upl_publication_date=in_date where upl_id=@_pid;
	set @_pid = get_upl_parent(@_pid);
    end while;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-29  5:57:48
