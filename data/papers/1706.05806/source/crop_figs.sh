#! /bin/bash

find figs* | grep -E '\.(pdf|jpg|png)$' | xargs ./autocrop
