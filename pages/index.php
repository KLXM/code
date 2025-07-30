<?php

use rex_addon;
use rex_be_controller;
use rex_view;

$addon = rex_addon::get('code');
echo rex_view::title($addon->i18n('code_title'));
rex_be_controller::includeCurrentPageSubPath();