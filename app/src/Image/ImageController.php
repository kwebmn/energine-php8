<?php
namespace App\Image;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

final class ImageController
{
    public function __construct(private ImageService $service)
    {
    }

    #[Route('/img/{path}', name: 'img', requirements: ['path' => '.+'], methods: ['GET'])]
    public function img(Request $req, string $path): Response
    {
        return $this->service->render($req, $path, $req->query->all());
    }

    #[Route('/resizer/w{w}-h{h}/{path}', name: 'img_compat', requirements: ['w' => '\\d+', 'h' => '\\d+', 'path' => '.+'], methods: ['GET'])]
    public function compat(Request $req, int $w, int $h, string $path): Response
    {
        $params = $req->query->all();
        $params['w'] = $w;
        $params['h'] = $h;
        return $this->service->render($req, $path, $params);
    }
}
