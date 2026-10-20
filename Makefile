# VideoMill — central builder include (ADR-0003).
# Host:      make up | make sh | make x T=<target> [ARGS=...]   (see Makefile.local)
# Container: make deps | make build | make run ARGS="..." | make test

STACK := video

ifeq ($(shell [ -f /.dockerenv ] && echo yes),yes)
BUILDER_PATH ?= /usr/src/builder
else
BUILDER_PATH ?= $(HOME)/work/projects/builder
endif

include $(BUILDER_PATH)/Makefile
