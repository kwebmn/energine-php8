<?php
/**
 * Ресайзер изображений (форк TimThumb)
 *
 * Основные изменения относительно оригинала:
 * - Всегда кодирует в WebP (независимо от входного формата и Accept).
 * - Запрещены внешние URL; обрабатываются только локальные файлы проекта.
 * - Вырезаны webshot, фильтры и шарпинг — остались resize/crop/канвас.
 * - Сохранена совместимость кэша (директории/суффиксы/304/Last-Modified).
 * - Требуется PHP 8.0+ и GD с поддержкой WebP.
 *
 * Основано на TimThumb (Ben Gillbanks, Mark Maunder; работа Tim McDaniels, Darren Hoyt)
 * Лицензия: GNU GPL v2 — http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 */

/*
 * --- Конфигурация TimThumb ---
 * Рекомендуется переопределять значения в файле timthumb-config.php —
 * он автоматически подключается, чтобы не править этот файл при обновлениях.
 */
define ('VERSION', '2.8.13');																		// Версия скрипта
// Загружаем timthumb-config.php при наличии. Иначе — используем значения ниже.
if( file_exists(dirname(__FILE__) . '/timthumb-config.php'))	require_once('timthumb-config.php');
if(! defined('DEBUG_ON') )					define ('DEBUG_ON', true);								// Отладочный лог в error_log веб-сервера
if(! defined('DEBUG_LEVEL') )				define ('DEBUG_LEVEL', 3);								// Уровень детализации отладки (1..3)
if(! defined('MEMORY_LIMIT') )				define ('MEMORY_LIMIT', '130M');							// Лимит памяти PHP для обработки изображения
if(! defined('DISPLAY_ERROR_MESSAGES') )	define ('DISPLAY_ERROR_MESSAGES', true);				// Показ текстов ошибок (выключать на продакшене)
// Загрузка и кэширование изображений
if(! defined('FILE_CACHE_ENABLED') ) 		define ('FILE_CACHE_ENABLED', TRUE);					// Сохранять обработанные изображения на диск
if(! defined('FILE_CACHE_TIME_BETWEEN_CLEANS'))	define ('FILE_CACHE_TIME_BETWEEN_CLEANS', 30*86400);	// Период очистки кэша

if(! defined('FILE_CACHE_MAX_FILE_AGE') ) 	define ('FILE_CACHE_MAX_FILE_AGE', 30*86400);				// Возраст файла для удаления из кэша
if(! defined('FILE_CACHE_SUFFIX') ) 		define ('FILE_CACHE_SUFFIX', '.timthumb.txt');			// Суффикс файлов кэша
if(! defined('FILE_CACHE_PREFIX') ) 		define ('FILE_CACHE_PREFIX', 'timthumb');				// Префикс файлов кэша
if(! defined('FILE_CACHE_DIRECTORY') ) 		define ('FILE_CACHE_DIRECTORY', './cache');				// Директория кэша
if(! defined('MAX_FILE_SIZE') )				define ('MAX_FILE_SIZE', 104857600);						// Максимальный размер входного файла (в байтах)

// Кэширование в браузере
if(! defined('BROWSER_CACHE_MAX_AGE') ) 	define ('BROWSER_CACHE_MAX_AGE', 30*864000);				// Время кэширования в браузере
if(! defined('BROWSER_CACHE_DISABLE') ) 	define ('BROWSER_CACHE_DISABLE', false);				// Отключить кеш браузера (для отладки)

// Размеры и значения по умолчанию
if(! defined('MAX_WIDTH') )					define ('MAX_WIDTH', 2500);								// Максимальная ширина
if(! defined('MAX_HEIGHT') )				define ('MAX_HEIGHT', 2500);							// Максимальная высота
if(! defined('NOT_FOUND_IMAGE') )			define ('NOT_FOUND_IMAGE', '');							// Картинка для 404 (опционально)
if(! defined('ERROR_IMAGE') )				define ('ERROR_IMAGE', '/images/no-image.png');								// Картинка при ошибке (опционально)
if(! defined('PNG_IS_TRANSPARENT') )		define ('PNG_IS_TRANSPARENT', FALSE);					// Прозрачность PNG при рендере канваса
if(! defined('DEFAULT_Q') )					define ('DEFAULT_Q', 100);								// Качество WebP по умолчанию
if(! defined('DEFAULT_ZC') )				define ('DEFAULT_ZC', 1);								// Zoom/Crop по умолчанию
// Фильтры и шарпинг удалены; DEFAULT_F/DEFAULT_S не используются
if(! defined('DEFAULT_CC') )				define ('DEFAULT_CC', 'ffffff');						// Цвет фона канваса по умолчанию (hex)
if(! defined('DEFAULT_WIDTH') )				define ('DEFAULT_WIDTH', 100);							// Ширина по умолчанию
if(! defined('DEFAULT_HEIGHT') )			define ('DEFAULT_HEIGHT', 100);							// Высота по умолчанию

/**
 * Additional Parameters:
 * LOCAL_FILE_BASE_DIRECTORY = Override the DOCUMENT_ROOT. This is best used in timthumb-config.php
 */

// Компрессоры PNG удалены (всегда отдаём WebP)

/* Webshot (снимки веб-страниц) вырезан; соответствующие настройки и вызовы удалены. */
// -------------------------------------------------------------
// -------------- ДАЛЬШЕ КОНФИГУРАЦИЮ НЕ МЕНЯТЬ --------------
// -------------------------------------------------------------

timthumb::start();

class timthumb {
	protected $src = "";
	protected $is404 = false;
	protected $httpStatus = 400;
	protected $docRoot = "";
	protected $localImage = "";
	protected $localImageMTime = 0;
		protected $myHost = "";
		protected $isURL = false;
	protected $cachefile = '';
	protected $errors = array();
	protected $cacheDirectory = '';
	protected $startTime = 0;
	protected $lastBenchTime = 0;
	protected $cropTop = false;
	protected $salt = "";
	protected $fileCacheVersion = 1; //Generally if timthumb.php is modifed (upgraded) then the salt changes and all cache files are recreated. This is a backup mechanism to force regen.
	protected $filePrependSecurityBlock = "<?php die('Execution denied!'); //"; //Designed to have three letter mime type, space, question mark and greater than symbol appended. 6 bytes total.
        

	public static function start(){
		$tim = new timthumb();
		$tim->handleErrors();
		$tim->securityChecks();
		if($tim->tryBrowserCache()){
			exit(0);
		}
		$tim->handleErrors();
		if(FILE_CACHE_ENABLED && $tim->tryServerCache()){
			exit(0);
		}
		$tim->handleErrors();
		$tim->run();
		$tim->handleErrors();
		exit(0);
	}
	public function __construct(){
		// External sites list removed
		$this->startTime = microtime(true);
		date_default_timezone_set('UTC');
		$this->debug(1, "Starting new request from " . $this->getIP() . " to " . $_SERVER['REQUEST_URI']);
		$this->calcDocRoot();
		//On windows systems I'm assuming fileinode returns an empty string or a number that doesn't change. Check this.
		$this->salt = @filemtime(__FILE__) . '-' . @fileinode(__FILE__);
		$this->debug(3, "Salt is: " . $this->salt);
            if(FILE_CACHE_DIRECTORY){
                if(! is_dir(FILE_CACHE_DIRECTORY)){
                    @mkdir(FILE_CACHE_DIRECTORY);
                    if(! is_dir(FILE_CACHE_DIRECTORY)){
                        $this->error("Could not create the file cache directory.");
                        return; // constructors must not return a value
                    }
                }
                $this->cacheDirectory = FILE_CACHE_DIRECTORY;
                if (!touch($this->cacheDirectory . '/index.html')) {
                    $this->error("Could not create the index.html file - to fix this create an empty file named index.html file in the cache directory.");
                }
            } else {
                $this->cacheDirectory = sys_get_temp_dir();
            }
		//Clean the cache before we do anything because we don't want the first visitor after FILE_CACHE_TIME_BETWEEN_CLEANS expires to get a stale image. 
		$this->cleanCache();
		
        $this->myHost = preg_replace('/^www\./i', '', $_SERVER['HTTP_HOST']);
        $this->src = $this->param('src');
        // Strip local host from absolute URLs to get a path
        $this->src = preg_replace('/https?:\/\/(?:www\.)?' . $this->myHost . '/i', '', $this->src);
		
            if(strlen($this->src) <= 3){
                $this->error("No image specified");
                return; // constructors must not return a value
            }
        // Работаем только с локальными файлами

        $cachePrefix = '_int_';
            $this->localImage = $this->getLocalImagePath($this->src);
            if(! $this->localImage){
                $this->debug(1, "Could not find the local image: {$this->localImage}");
                $this->error("Could not find the internal image you specified.");
                $this->set404();
                return; // constructors must not return a value
            }
            $this->debug(1, "Local image path is {$this->localImage}");
            $this->localImageMTime = @filemtime($this->localImage);
            //We include the mtime of the local file in case in changes on disk.
            $this->cachefile = $this->cacheDirectory . '/' . FILE_CACHE_PREFIX . $cachePrefix . md5($this->salt . $this->localImageMTime . $_SERVER ['QUERY_STRING'] . $this->fileCacheVersion) . FILE_CACHE_SUFFIX;


            // Всегда ветка WebP в ключе кэша
            $this->cachefile = $this->cacheDirectory . '/' . FILE_CACHE_PREFIX . '_webp_' . $cachePrefix . md5($this->salt . $this->localImageMTime . $_SERVER ['QUERY_STRING'] . $this->fileCacheVersion) . FILE_CACHE_SUFFIX;
		$this->debug(2, "Cache file is: " . $this->cachefile);

            // no return value from constructors
        }
	public function run(){
        $this->debug(3, "Got request for internal image. Starting serveInternalImage()");
        $this->serveInternalImage();
        return true;
    }
	protected function handleErrors(){
		if($this->haveErrors()){ 
			if(NOT_FOUND_IMAGE && $this->is404()){
				if($this->serveImg(NOT_FOUND_IMAGE)){
					exit(0);
				} else {
					$this->error("Additionally, the 404 image that is configured could not be found or there was an error serving it.");
				}
			}
			if(ERROR_IMAGE){
				if($this->serveImg(ERROR_IMAGE)){
					exit(0);
				} else {
					$this->error("Additionally, the error image that is configured could not be found or there was an error serving it.");
				}
			}
			$this->serveErrors(); 
			exit(0); 
		}
		return false;
	}
    protected function tryBrowserCache(){
        if(BROWSER_CACHE_DISABLE){ $this->debug(3, "Browser caching is disabled"); return false; }
		if(!empty($_SERVER['HTTP_IF_MODIFIED_SINCE']) ){
			$this->debug(3, "Got a conditional get");
			$mtime = false;
			//We've already checked if the real file exists in the constructor
			if(! is_file($this->cachefile)){
				//If we don't have something cached, regenerate the cached image.
				return false;
			}
			if($this->localImageMTime){
				$mtime = $this->localImageMTime;
				$this->debug(3, "Local real file's modification time is $mtime");
			} else if(is_file($this->cachefile)){ //If it's not a local request then use the mtime of the cached file to determine the 304
				$mtime = @filemtime($this->cachefile);
				$this->debug(3, "Cached file's modification time is $mtime");
			}
			if(! $mtime){ return false; }

			$iftime = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
			$this->debug(3, "The conditional get's if-modified-since unixtime is $iftime");
			if($iftime < 1){
				$this->debug(3, "Got an invalid conditional get modified since time. Returning false.");
				return false;
			}
			if($iftime < $mtime){ //Real file or cache file has been modified since last request, so force refetch.
				$this->debug(3, "File has been modified since last fetch.");
				return false;
			} else { //Otherwise serve a 304
				$this->debug(3, "File has not been modified since last get, so serving a 304.");
				header ($_SERVER['SERVER_PROTOCOL'] . ' 304 Not Modified');
				$this->debug(1, "Returning 304 not modified");
				return true;
			}
		}
		return false;
	}
    protected function tryServerCache(){
        $this->debug(3, "Trying server cache");
            if(file_exists($this->cachefile)){
                $this->debug(3, "Cachefile {$this->cachefile} exists");
                $this->debug(3, "Trying to serve cachefile {$this->cachefile}");
			if($this->serveCacheFile()){
				$this->debug(3, "Succesfully served cachefile {$this->cachefile}");
				return true;
			} else {
				$this->debug(3, "Failed to serve cachefile {$this->cachefile} - Deleting it from cache.");
				//Image serving failed. We can't retry at this point, but lets remove it from cache so the next request recreates it
				@unlink($this->cachefile);
				return true;
			}
		}
	}
	protected function error($err){
		$this->debug(3, "Adding error message: $err");
		$this->errors[] = $err;
		return false;

	}
	protected function haveErrors(){
            if(count($this->errors) > 0){
			return true;
		}
		return false;
	}
	protected function serveErrors(){
		$code = $this->httpStatus ?: 400;
		if ($this->is404()) { $code = 404; }
		$reason = ($code === 404) ? 'Not Found' : (($code === 500) ? 'Internal Server Error' : 'Bad Request');
		header ($_SERVER['SERVER_PROTOCOL'] . ' ' . $code . ' ' . $reason);
		if ( ! DISPLAY_ERROR_MESSAGES ) {
			return;
		}
		$html = '<ul>';
		foreach($this->errors as $err){
			$html .= '<li>' . htmlentities($err) . '</li>';
		}
		$html .= '</ul>';
		echo '<h1>A TimThumb error has occured</h1>The following error(s) occured:<br />' . $html . '<br />';
		echo '<br />Query String : ' . htmlentities( $_SERVER['QUERY_STRING'], ENT_QUOTES );
		echo '<br />TimThumb version : ' . VERSION . '</pre>';
	}
	protected function serveInternalImage(){
		$this->debug(3, "Local image path is $this->localImage");
		if(! $this->localImage){
			$this->sanityFail("localImage not set after verifying it earlier in the code.");
			return false;
		}
		$fileSize = filesize($this->localImage);
		if($fileSize > MAX_FILE_SIZE){
			$this->error("The file you specified is greater than the maximum allowed file size.");
			return false;
		}
		if($fileSize <= 0){
			$this->error("The file you specified is <= 0 bytes.");
			return false;
		}
		$this->debug(3, "Calling processImageAndWriteToCache() for local image.");
		if($this->processImageAndWriteToCache($this->localImage)){
			$this->serveCacheFile();
			return true;
		} else { 
			return false;
		}
	}
	protected function cleanCache(){
		if (FILE_CACHE_TIME_BETWEEN_CLEANS < 0) {
			return;
		}
		$this->debug(3, "cleanCache() called");
		$lastCleanFile = $this->cacheDirectory . '/timthumb_cacheLastCleanTime.touch';
		
		//If this is a new timthumb installation we need to create the file
		if(! is_file($lastCleanFile)){
			$this->debug(1, "File tracking last clean doesn't exist. Creating $lastCleanFile");
			if (!touch($lastCleanFile)) {
				$this->error("Could not create cache clean timestamp file.");
			}
			return;
		}
		if(@filemtime($lastCleanFile) < (time() - FILE_CACHE_TIME_BETWEEN_CLEANS) ){ //Cache was last cleaned more than 1 day ago
			$this->debug(1, "Cache was last cleaned more than " . FILE_CACHE_TIME_BETWEEN_CLEANS . " seconds ago. Cleaning now.");
			// Very slight race condition here, but worst case we'll have 2 or 3 servers cleaning the cache simultaneously once a day.
			if (!touch($lastCleanFile)) {
				$this->error("Could not create cache clean timestamp file.");
			}
			$files = glob($this->cacheDirectory . '/*' . FILE_CACHE_SUFFIX);
			if ($files) {
				$timeAgo = time() - FILE_CACHE_MAX_FILE_AGE;
				foreach($files as $file){
					if(@filemtime($file) < $timeAgo){
						$this->debug(3, "Deleting cache file $file older than max age: " . FILE_CACHE_MAX_FILE_AGE . " seconds");
						@unlink($file);
					}
				}
			}
			return true;
		} else {
			$this->debug(3, "Cache was cleaned less than " . FILE_CACHE_TIME_BETWEEN_CLEANS . " seconds ago so no cleaning needed.");
		}
		return false;
	}
	protected function processImageAndWriteToCache($localImage){
		$sData = getimagesize($localImage);
		$origType = $sData[2];
		$mimeType = $sData['mime'];

		$this->debug(3, "Mime type of image is $mimeType");
		if(! preg_match('/^image\/(?:gif|jpg|jpeg|png|webp)$/i', $mimeType)){
			return $this->error("The image being resized is not a valid gif, jpg or png.");
		}

		if (!function_exists ('imagecreatetruecolor')) {
		    return $this->error('GD Library Error: imagecreatetruecolor does not exist - please contact your webhost and ask them to install the GD library');
		}

		// Require GD with WebP support
		if (!function_exists('imagewebp')) {
			$this->httpStatus = 500;
			return $this->error('Server configuration error: GD must be built with WebP support (imagewebp is unavailable).');
		}

        // Filters removed: no imagefilter map

		// get standard input properties		
		$new_width =  (int) abs ($this->param('w', 0));
		$new_height = (int) abs ($this->param('h', 0));
		$zoom_crop = (int) $this->param('zc', DEFAULT_ZC);
		$quality = (int) abs ($this->param('q', DEFAULT_Q));
		$align = $this->cropTop ? 't' : $this->param('a', 'c');
        // Filters removed
        $filters = '';
        // Sharpen removed
        $sharpen = false;
		$canvas_color = $this->param('cc', DEFAULT_CC);
		$canvas_trans = (bool) $this->param('ct', '1');

		// set default width and height if neither are set already
		if ($new_width == 0 && $new_height == 0) {
		    $new_width = (int) DEFAULT_WIDTH;
		    $new_height = (int) DEFAULT_HEIGHT;
		}

		// ensure size limits can not be abused
		$new_width = min ($new_width, MAX_WIDTH);
		$new_height = min ($new_height, MAX_HEIGHT);

		// set memory limit to be able to have enough space to resize larger images
		$this->setMemoryLimit();

		// open the existing image
		$image = $this->openImage ($mimeType, $localImage);
		if ($image === false) {
			return $this->error('Unable to open image.');
		}

		// Get original width and height
		$width = imagesx ($image);
		$height = imagesy ($image);
		$origin_x = 0;
		$origin_y = 0;

		// generate new w/h if not provided
		if ($new_width && !$new_height) {
			$new_height = floor ($height * ($new_width / $width));
		} else if ($new_height && !$new_width) {
			$new_width = floor ($width * ($new_height / $height));
		}

		// scale down and add borders
		if ($zoom_crop == 3) {

			$final_height = $height * ($new_width / $width);

			if ($final_height > $new_height) {
				$new_width = $width * ($new_height / $height);
			} else {
				$new_height = $final_height;
			}

		}

		// create a new true color image
		$canvas = imagecreatetruecolor ($new_width, $new_height);
		imagealphablending ($canvas, false);

		if (strlen($canvas_color) == 3) { //if is 3-char notation, edit string into 6-char notation
			$canvas_color =  str_repeat(substr($canvas_color, 0, 1), 2) . str_repeat(substr($canvas_color, 1, 1), 2) . str_repeat(substr($canvas_color, 2, 1), 2); 
		} else if (strlen($canvas_color) != 6) {
			$canvas_color = DEFAULT_CC; // on error return default canvas color
 		}

		$canvas_color_R = hexdec (substr ($canvas_color, 0, 2));
		$canvas_color_G = hexdec (substr ($canvas_color, 2, 2));
		$canvas_color_B = hexdec (substr ($canvas_color, 4, 2));

		// Create a new transparent color for image
	    // If is a png and PNG_IS_TRANSPARENT is false then remove the alpha transparency 
		// (and if is set a canvas color show it in the background)
		if(preg_match('/^image\/png$/i', $mimeType) && !PNG_IS_TRANSPARENT && $canvas_trans){ 
			$color = imagecolorallocatealpha ($canvas, $canvas_color_R, $canvas_color_G, $canvas_color_B, 127);		
		}else{
			$color = imagecolorallocatealpha ($canvas, $canvas_color_R, $canvas_color_G, $canvas_color_B, 0);
		}


		// Completely fill the background of the new image with allocated color.
		imagefill ($canvas, 0, 0, $color);

		// scale down and add borders
		if ($zoom_crop == 2) {

			$final_height = $height * ($new_width / $width);

			if ($final_height > $new_height) {

				$origin_x = $new_width / 2;
				$new_width = $width * ($new_height / $height);
				$origin_x = round ($origin_x - ($new_width / 2));

			} else {

				$origin_y = $new_height / 2;
				$new_height = $final_height;
				$origin_y = round ($origin_y - ($new_height / 2));

			}

		}

		// Restore transparency blending
		imagesavealpha ($canvas, true);

		if ($zoom_crop > 0) {

			$src_x = $src_y = 0;
			$src_w = $width;
			$src_h = $height;

			$cmp_x = $width / $new_width;
			$cmp_y = $height / $new_height;

			// calculate x or y coordinate and width or height of source
			if ($cmp_x > $cmp_y) {

				$src_w = round ($width / $cmp_x * $cmp_y);
				$src_x = round (($width - ($width / $cmp_x * $cmp_y)) / 2);

			} else if ($cmp_y > $cmp_x) {

				$src_h = round ($height / $cmp_y * $cmp_x);
				$src_y = round (($height - ($height / $cmp_y * $cmp_x)) / 2);

			}

			// positional cropping!
			if ($align) {
				if (strpos ($align, 't') !== false) {
					$src_y = 0;
				}
				if (strpos ($align, 'b') !== false) {
					$src_y = $height - $src_h;
				}
				if (strpos ($align, 'l') !== false) {
					$src_x = 0;
				}
				if (strpos ($align, 'r') !== false) {
					$src_x = $width - $src_w;
				}
			}

			imagecopyresampled ($canvas, $image, $origin_x, $origin_y, $src_x, $src_y, $new_width, $new_height, $src_w, $src_h);

		} else {

        // Копируем и ресемплируем всё изображение
			imagecopyresampled ($canvas, $image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);

		}

        // Фильтры удалены

        // Шарпинг удалён
        // Из ядра WordPress: уменьшает размер PNG до ~70% для палитровых изображений
		if ( (IMAGETYPE_PNG == $origType || IMAGETYPE_GIF == $origType) && function_exists('imageistruecolor') && !imageistruecolor( $image ) && imagecolortransparent( $image ) > 0 ){
			imagetruecolortopalette( $canvas, false, imagecolorstotal( $image ) );
		}

			$imgType = 'web';
			$tempfile = tempnam($this->cacheDirectory, 'timthumb_tmpimg_');
			if (function_exists('imagepalettetotruecolor')) { @imagepalettetotruecolor($canvas); }
			imagewebp($canvas, $tempfile, $quality);

        // Шаги оптимизации PNG удалены (выход всегда WebP)

		$this->debug(3, "Rewriting image with security header.");
		$tempfile4 = tempnam($this->cacheDirectory, 'timthumb_tmpimg_');
		$context = stream_context_create ();
        $fp = fopen($tempfile,'r',0,$context);
        // В начало файла пишется защитный префикс + тип (3 байта)
        file_put_contents($tempfile4, $this->filePrependSecurityBlock . $imgType . ' ?' . '>');
        file_put_contents($tempfile4, $fp, FILE_APPEND);
        fclose($fp);
        @unlink($tempfile);
        $this->debug(3, "Locking and replacing cache file.");
        $lockFile = $this->cachefile . '.lock';
        $fh = fopen($lockFile, 'w');
        if(! $fh){
            return $this->error("Could not open the lockfile for writing an image.");
        }
        if(flock($fh, LOCK_EX)){
            @unlink($this->cachefile); // Подчищаем на всякий случай перед заменой (rename обычно перезаписывает)
            rename($tempfile4, $this->cachefile);
            flock($fh, LOCK_UN);
            fclose($fh);
            @unlink($lockFile);
        } else {
			fclose($fh);
			@unlink($lockFile);
			@unlink($tempfile4);
			return $this->error("Could not get a lock for writing.");
		}
		$this->debug(3, "Done image replace with security header. Cleaning up and running cleanCache()");
		imagedestroy($canvas);
		imagedestroy($image);
		return true;
	}
	protected function calcDocRoot(){
		$docRoot = @$_SERVER['DOCUMENT_ROOT'];
		if (defined('LOCAL_FILE_BASE_DIRECTORY')) {
			$docRoot = LOCAL_FILE_BASE_DIRECTORY;   
		}
		if(!isset($docRoot)){ 
			$this->debug(3, "DOCUMENT_ROOT is not set. This is probably windows. Starting search 1.");
			if(isset($_SERVER['SCRIPT_FILENAME'])){
				$docRoot = str_replace( '\\', '/', substr($_SERVER['SCRIPT_FILENAME'], 0, 0-strlen($_SERVER['PHP_SELF'])));
				$this->debug(3, "Generated docRoot using SCRIPT_FILENAME and PHP_SELF as: $docRoot");
			} 
		}
		if(!isset($docRoot)){ 
			$this->debug(3, "DOCUMENT_ROOT still is not set. Starting search 2.");
			if(isset($_SERVER['PATH_TRANSLATED'])){
				$docRoot = str_replace( '\\', '/', substr(str_replace('\\\\', '\\', $_SERVER['PATH_TRANSLATED']), 0, 0-strlen($_SERVER['PHP_SELF'])));
				$this->debug(3, "Generated docRoot using PATH_TRANSLATED and PHP_SELF as: $docRoot");
			} 
		}
		if($docRoot && $_SERVER['DOCUMENT_ROOT'] != '/'){ $docRoot = preg_replace('/\/$/', '', $docRoot); }
		$this->debug(3, "Doc root is: " . $docRoot);
		$this->docRoot = $docRoot;

	}
	protected function getLocalImagePath($src){
		$src = ltrim($src, '/'); //strip off the leading '/'
		if(! $this->docRoot){
			$this->debug(3, "We have no document root set, so as a last resort, lets check if the image is in the current dir and serve that.");
			//We don't support serving images outside the current dir if we don't have a doc root for security reasons.
			$file = preg_replace('/^.*?([^\/\\\\]+)$/', '$1', $src); //strip off any path info and just leave the filename.
			if(is_file($file)){
				return $this->realpath($file);
			}
			return $this->error("Could not find your website document root and the file specified doesn't exist in timthumbs directory. We don't support serving files outside timthumb's directory without a document root for security reasons.");
		} else if ( ! is_dir( $this->docRoot ) ) {
			$this->error("Server path does not exist. Ensure variable \$_SERVER['DOCUMENT_ROOT'] is set correctly");
		}
		
		//Do not go past this point without docRoot set

		//Try src under docRoot
		if(file_exists ($this->docRoot . '/' . $src)) {
			$this->debug(3, "Found file as " . $this->docRoot . '/' . $src);
			$real = $this->realpath($this->docRoot . '/' . $src);
			if(stripos($real, $this->docRoot) === 0){
				return $real;
			} else {
				$this->debug(1, "Security block: The file specified occurs outside the document root.");
				//allow search to continue
			}
		}
		//Check absolute paths and then verify the real path is under doc root
		$absolute = $this->realpath('/' . $src);
		if($absolute && file_exists($absolute)){ //realpath does file_exists check, so can probably skip the exists check here
			$this->debug(3, "Found absolute path: $absolute");
			if(! $this->docRoot){ $this->sanityFail("docRoot not set when checking absolute path."); }
			if(stripos($absolute, $this->docRoot) === 0){
				return $absolute;
			} else {
				$this->debug(1, "Security block: The file specified occurs outside the document root.");
				//and continue search
			}
		}
		
		$base = $this->docRoot;
		
		// account for Windows directory structure
		if (strstr($_SERVER['SCRIPT_FILENAME'],':')) {
			$sub_directories = explode('\\', str_replace($this->docRoot, '', $_SERVER['SCRIPT_FILENAME']));
		} else {
			$sub_directories = explode('/', str_replace($this->docRoot, '', $_SERVER['SCRIPT_FILENAME']));
		}

		foreach ($sub_directories as $sub){
			$base .= $sub . '/';
			$this->debug(3, "Trying file as: " . $base . $src);
			if(file_exists($base . $src)){
				$this->debug(3, "Found file as: " . $base . $src);
				$real = $this->realpath($base . $src);
				if(stripos($real, $this->realpath($this->docRoot)) === 0){
					return $real;
				} else {
					$this->debug(1, "Security block: The file specified occurs outside the document root.");
					//And continue search
				}
			}
		}
		return false;
	}
	protected function realpath($path){
		// Удаляем относительные сегменты вида "/dir/../"
		$remove_relatives = '/\w+\/\.\.\//';
		while(preg_match($remove_relatives,$path)){
		    $path = preg_replace($remove_relatives, '', $path);
		}
		// Если остались "../" — используем PHP realpath (также разыменует symlink)
		return preg_match('#^\.\./|/\.\./#', $path) ? realpath($path) : $path;
	}
//
	protected function serveCacheFile(){
		$this->debug(3, "Serving {$this->cachefile}");
		if(! is_file($this->cachefile)){
			$this->error("serveCacheFile called in timthumb but we couldn't find the cached file.");
			return false;
		}
		$fp = fopen($this->cachefile, 'rb');
		if(! $fp){ return $this->error("Could not open cachefile."); }
		fseek($fp, strlen($this->filePrependSecurityBlock), SEEK_SET);
		$imgType = fread($fp, 3);
		fseek($fp, 3, SEEK_CUR);
		if(ftell($fp) != strlen($this->filePrependSecurityBlock) + 6){
			@unlink($this->cachefile);
			return $this->error("The cached image file seems to be corrupt.");
		}
		$imageDataSize = filesize($this->cachefile) - (strlen($this->filePrependSecurityBlock) + 6);
		$this->sendImageHeaders($imgType, $imageDataSize);
		$bytesSent = @fpassthru($fp);
		fclose($fp);
		if($bytesSent > 0){
			return true;
		}
		$content = file_get_contents ($this->cachefile);
		if ($content != FALSE) {
			$content = substr($content, strlen($this->filePrependSecurityBlock) + 6);
			echo $content;
			$this->debug(3, "Served using file_get_contents and echo");
			return true;
		} else {
			$this->error("Cache file could not be loaded.");
			return false;
		}
	}
    protected function sendImageHeaders($mimeType, $dataSize){
        // Всегда отвечаем WebP
        $mimeType = 'image/webp';
        
        $gmdate_expires = gmdate ('D, d M Y H:i:s', strtotime ('now +10 days')) . ' GMT';
        $gmdate_modified = gmdate ('D, d M Y H:i:s') . ' GMT';
        // Заголовки ответа и отдача тела
        header ('Content-Type: ' . $mimeType);
		header ('Accept-Ranges: none'); // Диапазонные запросы не поддерживаются
		header ('Last-Modified: ' . $gmdate_modified);
		header ('Content-Length: ' . $dataSize);
		if(BROWSER_CACHE_DISABLE){
			$this->debug(3, "Browser cache is disabled so setting non-caching headers.");
			header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
			header("Pragma: no-cache");
			header('Expires: ' . gmdate ('D, d M Y H:i:s', time()));
		} else {
			$this->debug(3, "Browser caching is enabled");
			header('Cache-Control: max-age=' . BROWSER_CACHE_MAX_AGE . ', must-revalidate');
			header('Expires: ' . $gmdate_expires);
		}
		return true;
	}
    protected function securityChecks(){
        // Принимаем только локальные безопасные пути в пределах проекта
        $src = (string)$this->src;
        // Запрет управляющих символов и нулевых байт
        if ($src === '' || preg_match('/[\x00-\x1F\x7F]/', $src)) {
            $this->error('Invalid source path.');
            return false;
        }
        // Блокируем схемы/протоколы (data:, file:, http:, // и т.п.)
        if (preg_match('#^\s*(?:[a-z][a-z0-9+\-.]*:|//)#i', $src)) {
            $this->error('External URLs are not allowed.');
            return false;
        }
        // Базовая защита от traversal
        if (strpos($src, '..') !== false) {
            $this->error('Path traversal detected.');
            return false;
        }
        return true;
    }
	protected function param($property, $default = ''){
		if (isset ($_GET[$property])) {
			return $_GET[$property];
		} else {
			return $default;
		}
	}
	protected function openImage($mimeType, $src){
		switch ($mimeType) {
			case 'image/webp':
				$image = imagecreatefromwebp ($src);
				break;


			case 'image/jpeg':
				$image = imagecreatefromjpeg ($src);
				break;

			case 'image/png':
				$image = imagecreatefrompng ($src);
				imagealphablending( $image, true );
				imagesavealpha( $image, true );
				break;

			case 'image/gif':
				$image = imagecreatefromgif ($src);
				break;
			
			default:
				$this->error("Unrecognised mimeType");
		}

		return $image;
	}
	protected function getIP(){
		$rem = @$_SERVER["REMOTE_ADDR"];
		$ff = @$_SERVER["HTTP_X_FORWARDED_FOR"];
		$ci = @$_SERVER["HTTP_CLIENT_IP"];
		if(preg_match('/^(?:192\.168|172\.16|10\.|127\.)/', $rem)){ 
			if($ff){ return $ff; }
			if($ci){ return $ci; }
			return $rem;
		} else {
			if($rem){ return $rem; }
			if($ff){ return $ff; }
			if($ci){ return $ci; }
			return "UNKNOWN";
		}
	}
	protected function debug($level, $msg){
		if(DEBUG_ON && $level <= DEBUG_LEVEL){
			$execTime = sprintf('%.6f', microtime(true) - $this->startTime);
			$tick = sprintf('%.6f', 0);
			if($this->lastBenchTime > 0){
				$tick = sprintf('%.6f', microtime(true) - $this->lastBenchTime);
			}
			$this->lastBenchTime = microtime(true);
			error_log("TimThumb Debug line " . __LINE__ . " [$execTime : $tick]: $msg");
		}
	}
	protected function sanityFail($msg){
		return $this->error("There is a problem in the timthumb code. Message: Please report this error at <a href='http://code.google.com/p/timthumb/issues/list'>timthumb's bug tracking page</a>: $msg");
	}
	protected function getMimeType($file){
		$info = getimagesize($file);
		if(is_array($info) && $info['mime']){
			return $info['mime'];
		}
		return '';
	}
	protected function setMemoryLimit(){
		$inimem = ini_get('memory_limit');
		$inibytes = timthumb::returnBytes($inimem);
		$ourbytes = timthumb::returnBytes(MEMORY_LIMIT);
		if($inibytes < $ourbytes){
			ini_set ('memory_limit', MEMORY_LIMIT);
			$this->debug(3, "Increased memory from $inimem to " . MEMORY_LIMIT);
		} else {
			$this->debug(3, "Not adjusting memory size because the current setting is " . $inimem . " and our size of " . MEMORY_LIMIT . " is smaller.");
		}
	}
	protected static function returnBytes($size_str){
		switch (substr ($size_str, -1))
		{
			case 'M': case 'm': return (int)$size_str * 1048576;
			case 'K': case 'k': return (int)$size_str * 1024;
			case 'G': case 'g': return (int)$size_str * 1073741824;
			default: return $size_str;
		}
	}
	
	// External URL fetch removed
	protected function serveImg($file){
		$s = getimagesize($file);
		if(! ($s && $s['mime'])){
			return false;
		}
		header ('Content-Type: ' . $s['mime']);
		header ('Content-Length: ' . filesize($file) );
		header ('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
		header ("Pragma: no-cache");
		$bytes = @readfile($file);
		if($bytes > 0){
			return true;
		}
		$content = @file_get_contents ($file);
		if ($content != FALSE){
			echo $content;
			return true;
		}
		return false;

	}
	protected function set404(){
		$this->is404 = true;
	}
	protected function is404(){
		return $this->is404;
	}
}
