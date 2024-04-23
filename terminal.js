class Terminal {
    constructor(config) {
        config = config || {};
        this.width = config.width;
        this.height = config.height;
        this.font_size = config.font_size || 16;
        this.font_style = config.font_style || 'normal';
        this.font_variant = config.font_variant || 'normal';
        this.font_weight = config.font_weight || 'normal';
        this.font_family = config.font_family || 'Courier New';
        this.font_color = config.font_color || '#FFFFFF';
        this.background_color = config.background_color || '#000000';
        this.on_load = config.on_load || ((stdlib) => {
        });
        this.on_exit = config.on_exit || ((e) => {
        });
        this.programs = {};
    }

    add_program(name, func) {
        this.programs[name] = func;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    bind(identifier) {
        const that = this;
        const file_system = {
            type: 'd',
            nodes: {
                'home': {
                    type: 'd',
                    nodes: {
                        'about': {
                            type: 'f',
                            content: '<h1>-- Profile --</h1>' +
                                '<p><b>First Name:</b> Joshua</p>' +
                                '<p><b>Last Name:</b> Jones<p>' +
                                '<br/>' +
                                '<h1>-- Employment History --</h1>' +
                                '<ul>' +
                                '<li>' +
                                '<h2>Dynata</h2>' +
                                '<p><b>From:</b> 2020-12-08</p>' +
                                '<p><b>To:</b> Present</p>' +
                                '</li>' +
                                '</ul>'
                        },
                        'friends': {
                            type: 'd',
                            nodes: {
                                'Rachael': {
                                    type: 'f',
                                    content: 'this is about Rachael'
                                }
                            }
                        }
                    }
                }
            }
        };

        class File {
            constructor() {
                this.type = 'f';
                this.content = '';
            }
        }

        class Directory {
            constructor() {
                this.type = 'd';
                this.nodes = {};
            }
        }

        class Process {
            constructor() {
                this.type = 'p';
                this.open_files = [];
            }
        }

        const handles = {
            ndx: 0,
            hnd: [],
            acquire: function (obj) {
                let i = 0;
                for (; this.hnd[i] !== undefined; i++) {
                }
                this.hnd[i] = obj;
                return i;
            },
            lookup: function (handle) {
                const hnd = this.hnd[handle];
                if (handle === undefined) {
                    throw 'no such handle: ' + handle;
                }
                return hnd;
            },
            close: function (handle) {
                delete this.hnd[handle];
            }
        };

        const stdout = handles.acquire(new File());

        const cursor = {
            char: '_',
            pos: 0,
            visible: true,
            blink: function () {
                if (this.freeze !== undefined) {
                    this.freeze();
                }
                let that = this;

                let mirror = function () {
                    that.visible = !that.visible;
                };
                (function (parent) {
                    let blink_interval = setInterval(() => {
                        mirror();
                    }, 600);
                    parent.freeze = function () {
                        clearInterval(blink_interval);
                        this.visible = true;
                    };
                }(this));
            },
            text: function () {
                return this.visible ? this.char : ' ';
            },
            move_left: function (step) {
                step = step || 1;
                this.pos += -(step);
            },
            move_right: function (step) {
                step = step || 1;
                this.pos += step;
            },
            reset: function () {
                this.pos = prefix().length;
            }
        };

        cursor.blink();

        let dir = '/home';
        let prefix = function () {
            return (dir.substring(dir.lastIndexOf('/') + 1) || '/') + ' % ';
        };
        let text = prefix();
        let commands = [];
        let cmdpos = 0;

        function resolve_path(current_path, path) {
            if (current_path === path) {
                return path;
            }
            let keys = path === '/' ? [''] : path.split('/');
            let path_parts = current_path === '/' ? [''] : current_path.split('/');
            for (let i = 0; i < keys.length; i++) {
                switch (keys[i]) {
                    case '.':
                        break;
                    case '..':
                        if (path_parts.length > 0) {
                            path_parts.pop();
                        }
                        break;
                    case '':
                        if (i === 0) {
                            path_parts = [''];
                        }
                        break;
                    default:
                        path_parts.push(keys[i]);
                        break;
                }
            }
            return path_parts.join('/');
        }

        function find_node(path) {
            let resolved_path = resolve_path(dir, path);
            let path_parts = resolved_path.split('/');
            let node = file_system;
            for (let i = 0; i < path_parts.length; i++) {
                if (node === undefined) {
                    break;
                }
                if (path_parts[i] !== '') {
                    node = node.nodes[path_parts[i]];
                }
            }
            return node;
        }

        let programs = {
            'clear': (args, stdlib) => {
                stdlib.clear();
                stdlib.cursor_reset();
            },
            'background': (args) => {
                that.background_color = args[0];
                canvas.style.backgroundColor = that.background_color;
            },
            'font': (args) => {
                switch (args[0]) {
                    case 'color':
                        that.font_color = args[1];
                        break;
                    case 'style':
                        that.font_style = args[1];
                        break;
                    case 'variant':
                        that.font_variant = args[1];
                        break;
                    case 'weight':
                        that.font_weight = args[1];
                        break;
                    case 'size':
                        if (!isNaN(args[1])) {
                            that.font_size = parseInt(args[1]);
                        }
                        break;
                    case 'family':
                        that.font_family = args[1];
                        break;
                }
            },
            'howdy': (args, stdlib) => {
                stdlib.print('hi there!\n');
            },
            'echo': (args, stdlib) => {
                let buf = '';
                for (let i = 0; i < args.length; i++) {
                    if (i > 0) {
                        buf += ' ';
                    }
                    buf += args[i]
                }
                stdlib.print(buf + '\n');
            },
            'ls': (args, stdlib) => {
                let list = false;
                let all = false;
                let path = dir;
                for (let i = 0; i < args.length; i++) {
                    switch (args[i].substring(0, 1)) {
                        case '-':
                            let options = args[i].substring(1);
                            for (let j = 0; j < options.length; j++) {
                                switch (options[j]) {
                                    case 'l':
                                        list = true;
                                        break;
                                    case 'a':
                                        all = true;
                                        break;
                                }
                            }
                            break;
                        case '--list':
                            list = true;
                            break;
                        case '--all':
                            all = true;
                            break;
                        default:
                            path = args[i];
                            break;
                    }
                }
                path = resolve_path(dir, path);
                let node = find_node(path);
                if (node === undefined || node.type !== 'd') {
                    stdlib.print('not a directory: ' + path + '\n');
                    return;
                }
                let keys = Object.keys(node.nodes);
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i].substring(0, 1) !== '.' || all) {
                        if (list) {
                            stdlib.print(node.nodes[keys[i]].type + '  ' + keys[i] + '\n');
                        } else {
                            stdlib.print(keys[i] + '\n');
                        }
                    }
                }
            },
            'cd': (args, stdlib) => {
                let path = args[0] || dir;
                path = resolve_path(dir, path);
                let node = find_node(path);
                if (node === undefined || node.type !== 'd') {
                    stdlib.print('not a directory: ' + path + '\n');
                    return;
                }
                dir = path || '/';
            },
            'pwd': (args, stdlib) => {
                stdlib.print(dir + '\n');
            },
            'cat': (args, stdlib) => {
                let path = args[0] || dir;
                try {
                    let content = stdlib.read_all(stdlib.open(path));
                    stdlib.print(content + '\n');
                } catch (e) {
                    stdlib.print(e + '\n');
                }
            },
            'mkdir': function (args, stdlib) {
                let path = args[0];
                if (path === undefined) {
                    stdlib.print('missing argument: path\n');
                    return;
                }
                path = resolve_path(dir, path);
                let parent = path.substring(0, path.lastIndexOf('/'));
                let child = path.substring(path.lastIndexOf('/') + 1);
                let node = find_node(parent);
                if (node === undefined || node.type !== 'd') {
                    stdlib.print('not a directory: ' + path + '\n');
                    return;
                }
                node.nodes[child] = {
                    type: 'd',
                    nodes: {}
                };
            },
            'exit': function (args) {
                that.on_exit(canvas);
            }
        }

        programs = Object.assign(this.programs, programs);

        function parse_command(cmd) {
            if (cmd.length === 0) {
                return [''];
            }
            let parts = []
            let buf = '';
            let quote = null;
            let quoted = false;
            for (let i = 0; i < cmd.length; i++) {
                switch (cmd[i]) {
                    case "'":
                        if (quoted) {
                            if (quote === "'") {
                                quoted = false;
                                continue;
                            }
                        } else {
                            quoted = true;
                            quote = "'";
                            continue;
                        }
                        break;
                    case '"':
                        if (quoted) {
                            if (quote === '"') {
                                quoted = false;
                                continue;
                            }
                        } else {
                            quoted = true;
                            quote = '"';
                            continue;
                        }
                        break;
                }

                if (quoted) {
                    buf += cmd[i];
                } else {
                    switch (cmd[i]) {
                        case ' ':
                            if (buf.length > 0) {
                                parts.push(buf);
                                buf = '';
                            }
                            break;
                        case '>':
                            parts.push(buf);
                            buf = '';
                            parts.push('>');
                            break;
                        case '|':
                            parts.push(buf);
                            buf = '';
                            parts.push('|');
                            break;
                        default:
                            buf += cmd[i];
                            break;
                    }
                }
            }

            if (quoted) {
                return [];
            }

            if (buf.length > 0) {
                parts.push(buf)
            }
            return parts;
        }

        let stdlib = {
            STDOUT: stdout,
            clear: function () {
                handles.lookup(this.STDOUT).content = '';
            },
            cursor_left: step => {
                cursor.move_left(step);
            },
            cursor_right: step => {
                cursor.move_right(step);
            },
            cursor_reset: () => {
                cursor.reset();
            },
            exec: (name, args) => {
                let prog = programs[name];
                if (prog === undefined) {
                    throw 'invalid command: ' + name;
                }
                prog(args, stdlib, fs);
            },
            open: (path, create) => {
                path = resolve_path(dir, path);
                let parent = path.substring(0, path.lastIndexOf('/'));
                let child = path.substring(path.lastIndexOf('/') + 1);
                let parent_node = find_node(parent);
                if (parent_node === undefined || parent_node.type !== 'd') {
                    throw 'not a directory: ' + path;
                }
                if (parent_node.nodes[child] === undefined && create) {
                    parent_node.nodes[child] = new File();
                }
                const node = parent_node.nodes[child];
                if (node === undefined || node.type !== 'f') {
                    throw 'not a file: ' + path;
                }
                const hnd = handles.acquire(node);
                if (current_process !== null) {
                    handles.lookup(current_process).open_files.push(hnd);
                }
                return hnd;
            },
            print: function (str) {
                const node = handles.lookup(this.STDOUT);
                node.content += str;
            },
            fprint: (handle, str) => {
                const node = handles.lookup(handle);
                node.content += str;
            },
            read_all: (handle) => {
                const node = handles.lookup(handle);
                return node.content;
            },
            close: (handle) => {
                handles.close(handle);
                const proc = handles.lookup(current_process);
                const hnd = proc.open_files.indexOf(handle);
                if (hnd > -1) {
                    delete proc.open_files[hnd];
                }
            },
            getpid: () => {
                return current_process;
            },
            is_directory: (path) => {
                if (path === undefined) {
                    throw 'missing argument: path';
                }
                let node = find_node(path);
                return !(node === undefined || node.type !== 'd');
            },
            make_dir: (path) => {
                if (path === undefined) {
                    throw 'missing argument: path';
                }
                path = resolve_path(dir, path);
                let parent = path.substring(0, path.lastIndexOf('/'));
                let child = path.substring(path.lastIndexOf('/') + 1);
                let parent_node = find_node(parent);
                if (parent_node === undefined || parent_node.type !== 'd') {
                    throw 'not a directory: ' + path;
                }
                if (parent_node.nodes[child] !== undefined) {
                    throw path + ' already exists';
                }
                parent_node.nodes[child] = {
                    type: 'd',
                    nodes: {}
                };
            }
        };

        let current_process = null;

        document.addEventListener('keydown', (e) => {
            cursor.freeze();
            let prefix_length = prefix().length;
            switch (e.key) {
                case 'Enter':
                    let command = text.substring(prefix_length);
                    stdlib.print(text + '\n');
                    if (command.length === 0) {
                        break;
                    }
                    commands.push(command);
                    let command_parts = parse_command(command);
                    if (command_parts[0] in programs) {
                        const process = new Process();
                        current_process = handles.acquire(process);
                        programs[command_parts[0]](command_parts.slice(1), stdlib);
                        for (let i = 0; i < process.open_files.length; i++) {
                            handles.close(process.open_files[i]);
                        }
                        handles.close(current_process);
                        current_process = null;
                    } else {
                        stdlib.print('command not found: ' + command_parts[0] + '\n');
                    }
                    text = prefix();
                    cmdpos = 0;
                    break;
                case 'Backspace':
                    stdlib.cursor_left();
                    if (cursor.pos < prefix_length) {
                        cursor.pos = prefix_length;
                    }
                    text = text.substring(0, cursor.pos) + text.substring(cursor.pos + 1);
                    if (text.length < prefix_length) {
                        text = prefix();
                    }
                    break;
                case 'Shift':
                    break;
                case 'ArrowUp':
                    cmdpos++;
                    if (cmdpos > commands.length) {
                        cmdpos = commands.length;
                    }
                    text = prefix() + (commands[commands.length - cmdpos] || '');
                    cursor.pos = text.length;
                    break;
                case 'ArrowDown':
                    cmdpos--;
                    if (cmdpos < 1) {
                        cmdpos = 0;
                        text = prefix();
                    } else {
                        text = prefix() + commands[commands.length - cmdpos];
                    }
                    cursor.pos = text.length;
                    break;
                case 'ArrowLeft':
                    if (!e.metaKey) {
                        stdlib.cursor_left();
                        if (cursor.pos < prefix_length) {
                            cursor.pos = prefix_length;
                        }
                    } else {
                        cursor.pos = prefix_length;
                    }
                    break;
                case 'ArrowRight':
                    if (!e.metaKey) {
                        stdlib.cursor_right();
                        if (cursor.pos > text.length) {
                            cursor.pos = text.length;
                        }
                    } else {
                        cursor.pos = text.length;
                    }
                    break;
                case 'Control':
                case 'Meta':
                    break;
                default:
                    scroll_point = 0;
                    text = text.substring(0, cursor.pos) + e.key + text.substring(cursor.pos);
                    stdlib.cursor_right();
                    if (cursor.pos > text.length) {
                        cursor.pos = text.length;
                    }
                    if (e.key === ' ') {
                        e.preventDefault();
                    }
                    break;
            }
            cursor.blink();
        });

        cursor.pos = prefix().length;

        let parent = document.getElementById(identifier);
        const canvas = document.createElement("canvas");
        canvas.width = this.width || parent.offsetWidth;
        canvas.height = this.height || parent.offsetHeight;
        canvas.style.backgroundColor = this.background_color;
        const ctx = canvas.getContext('2d');
        parent.appendChild(canvas);

        let scroll_point = 0;

        canvas.addEventListener('wheel', e => {
            if (e.deltaY > 0) {
                scroll_point++;
            } else {
                scroll_point--;
            }
            if (scroll_point < 0) {
                scroll_point = 0;
            }
            e.preventDefault();
        });

        let mouse_down = true;

        canvas.addEventListener('mousedown', e => {
            mouse_down = true;
        });

        canvas.addEventListener('mouseup', e => {
            mouse_down = false;
        });

        canvas.addEventListener('mouseout', e => {
            mouse_down = false;
        });

        canvas.addEventListener('mousemove', e => {
            if (mouse_down) {
                scroll_point += e.movementY;
            }
            if (scroll_point < 0) {
                scroll_point = 0;
            }
        });

        this.on_load(stdlib);

        let main_loop = setInterval((function (that) {
            return () => {
                let width = that.width || parent.offsetWidth;
                let height = that.height || parent.offsetHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;
                }
                ctx.font = that.font_style + ' ' + that.font_variant + ' ' + that.font_weight + ' ' + that.font_size + 'px ' + that.font_family;
                ctx.fillStyle = that.font_color;
                const line_height = that.font_size + 5;
                let row_count = 0;
                let column_count = 0;
                let lines = [''];
                let max_lines = Math.floor(canvas.height / line_height);
                let history = handles.lookup(stdout).content;
                for (let i = 0; i < history.length; i++) {
                    if (history[i] === '\n' || Math.ceil(ctx.measureText(lines[row_count]).width) + 30 >= canvas.width) {
                        lines.push('');
                        row_count++;
                        column_count = 0;
                    }
                    if (history[i] === '\n') {
                        continue;
                    }
                    lines[row_count] += history[i];
                }
                let operation = text.substring(0, cursor.pos) + cursor.text() + text.substring(cursor.pos + 1);
                for (let i = 0; i < operation.length; i++) {
                    if (Math.ceil(ctx.measureText(lines[row_count]).width) + 30 >= canvas.width) {
                        lines.push('');
                        row_count++;
                        column_count = 0;
                    }
                    lines[row_count] += operation[i];
                }
                if (scroll_point > lines.length) {
                    scroll_point = lines.length;
                }
                let remove_cnt = Math.min(lines.length - max_lines, lines.length);
                for (let i = scroll_point; i < remove_cnt; i++) {
                    lines.shift();
                }
                for (let i = 0; i < Math.min(max_lines + 1, lines.length); i++) {
                    ctx.fillText(lines[i], 10, line_height * (i + 1));
                }
            }
        }(this)), 10);
    }
}