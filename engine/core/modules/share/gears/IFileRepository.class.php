<?php

declare(strict_types=1);

/**
 * Interface for file repositories (upload/storage backends).
 *
 * Implementations may represent local storage, read-only storage, or
 * other backends. Methods should either perform the action and return
 * a truthy result (or a metadata object where applicable), or throw a
 * SystemException on failure.
 */
interface IFileRepository
{
    /**
     * @param int    $id   Internal repository ID (upl_id).
     * @param string $base Base path within the repository (upl_path).
     */
    public function __construct($id, $base);

    /**
     * Internal short name of the implementation (e.g. "local", "ro").
     *
     * @return string
     */
    public function getName();

    /**
     * Set repository ID (upl_id).
     *
     * @param int $id
     * @return IFileRepository
     */
    public function setId($id);

    /**
     * Get repository ID (upl_id).
     *
     * @return int
     */
    public function getId();

    /**
     * Set base path within the repository (upl_path).
     *
     * @param string $base
     * @return IFileRepository
     */
    public function setBase($base);

    /**
     * Get base path within the repository (upl_path).
     *
     * @return string
     */
    public function getBase();

    /**
     * Capabilities.
     */
    public function allowsCreateDir();
    public function allowsUploadFile();
    public function allowsEditDir();
    public function allowsEditFile();
    public function allowsDeleteDir();
    public function allowsDeleteFile();

    /**
     * Upload a file into the repository.
     *
     * Implementations commonly return a metadata object (e.g. from analyze()).
     *
     * @param string $sourceFilename Absolute path to the temp/source file.
     * @param string $destFilename   Absolute path to destination in repo.
     * @return mixed                 Commonly an object with file meta, or true.
     */
    public function uploadFile($sourceFilename, $destFilename);

    /**
     * Upload an alternative (resized/variant) file.
     *
     * @param string $sourceFilename
     * @param string $destFilename
     * @param int    $width
     * @param int    $height
     * @return mixed                 Commonly an object with file meta, or true.
     */
    public function uploadAlt($sourceFilename, $destFilename, $width, $height);

    /**
     * Replace/update an existing file contents.
     *
     * @param string $sourceFilename
     * @param string $destFilename
     * @return bool
     */
    public function updateFile($sourceFilename, $destFilename);

    /**
     * Replace/update an existing alternative file.
     *
     * @param string $sourceFilename
     * @param string $destFilename
     * @param int    $width
     * @param int    $height
     * @return bool
     */
    public function updateAlt($sourceFilename, $destFilename, $width, $height);

    /**
     * Delete a file from the repository.
     *
     * @param string $filename
     * @return bool
     */
    public function deleteFile($filename);

    /**
     * Delete an alternative file from the repository.
     *
     * @param string $filename
     * @param int    $width
     * @param int    $height
     * @return bool
     */
    public function deleteAlt($filename, $width, $height);

    /**
     * Get meta-information about a file (mime, size, dimensions, flags).
     *
     * Expected fields typically include:
     *  - type (e.g. image|video|audio|zip|text|folder|unknown)
     *  - mime
     *  - width, height (for images)
     *  - is_mp4, is_webm, is_flv (for video variants)
     *
     * @param string $filename
     * @return object
     */
    public function analyze($filename);

    /**
     * Create a directory in the repository.
     *
     * @param string $dir
     * @return bool
     */
    public function createDir($dir);

    /**
     * Rename/move a directory in the repository.
     *
     * @param string $dir
     * @return bool
     */
    public function renameDir($dir);

    /**
     * Delete a directory from the repository (recursively if needed).
     *
     * @param string $dir
     * @return bool
     */
    public function deleteDir($dir);

    /**
     * Prepare/transform data returned by the repository before usage.
     *
     * @param array $data Reference to repository data array.
     * @return array|bool Modified data or false if unchanged/unsupported.
     */
    public function prepare(&$data);

    /**
     * Set a custom callback used by prepare() to transform data.
     *
     * @param callable $func
     * @return void
     */
    public function setPrepareFunction($func);
}
