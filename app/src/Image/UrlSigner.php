<?php
namespace App\Image;

final class UrlSigner
{
    public function __construct(private string $key)
    {
    }

    public function sign(string $method, string $path, array $params): string
    {
        ksort($params);
        $data = $method.'|'.$path.'|'.http_build_query($params);
        return hash_hmac('sha256', $data, $this->key);
    }

    public function verify(string $method, string $path, array $params, string $signature): bool
    {
        $expected = $this->sign($method, $path, $params);
        return hash_equals($expected, $signature);
    }
}
