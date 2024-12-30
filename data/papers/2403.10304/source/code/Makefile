PYTHON?= python

SOURCES= $(wildcard code-*.py)
TARGETS= ${SOURCES:.py=.pycon}

.SUFFIXES: .py .pycon
.py.pycon:
	python mkpyconcode $< >$@

.PHONY: all
all: ${TARGETS}

.PHONY: clean
clean:
	-rm -f ${TARGETS}
