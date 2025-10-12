import './styles/extended-vendor.css';

import './vendor-shims/jquery.js';
import './vendor-shims/jstree.js';
import 'vendor/codemirror/codemirror/lib/codemirror.js';
import 'vendor/codemirror/codemirror/mode/xml/xml.js';
import 'vendor/codemirror/codemirror/mode/javascript/javascript.js';
import 'vendor/codemirror/codemirror/mode/css/css.js';
import 'vendor/codemirror/codemirror/mode/htmlmixed/htmlmixed.js';

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

if (globalScope) {
    const vendorNamespace = globalScope.EnergineVendor = globalScope.EnergineVendor || {};
    vendorNamespace.tiptap = {
        Editor,
        StarterKit,
        Link,
        Underline,
        TextStyle,
        Color,
        TextAlign,
        Image,
        Placeholder,
        Highlight,
    };
}
