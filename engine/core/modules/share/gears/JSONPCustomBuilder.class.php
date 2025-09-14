<?php
declare(strict_types=1);

/**
 * JSONP builder: wraps JSON payload into a JS callback.
 */
final class JSONPCustomBuilder extends JSONCustomBuilder
{
    /** JS callback name (path), e.g. "fn" or "NS.fn". */
    private string $callback = 'undefined';

    /**
     * Set JSONP callback name.
     * Accepts dotted paths and bracket notation; strips unsafe chars.
     */
    public function setCallback(string $callback): self
    {
        $cb = preg_replace('/[^A-Za-z0-9_\.\$\[\]]/', '', trim($callback));
        $this->callback = ($cb === '') ? 'callback' : $cb;
        return $this;
    }

    /**
     * Returns: callback(<json>);
     */
    public function getResult(): string
    {
        $json = json_encode(
            $this->properties,
            JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP
        );

        return $this->callback . '(' . $json . ');';
    }
}