class Terminal {
    constructor(config) {
        config = config || {};
        this.width = config.width || 550;
        this.height = config.height || 245;
        this.font_size = config.font_size || 16;
        this.font_family = config.font_family || 'Courier New';
        this.font_color = config.font_color || '#FFFFFF';
        this.background_color = config.background_color || '#000000';
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    bind(identifier) {
        const line_height = this.font_size + 5;
        const fs = {
            type: 'd',
            nodes: {
                'home': {
                    type: 'd',
                    nodes: {
                        'about': {
                            type: 'f',
                            content: 'this is about me'
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

        const history = {
            data: '',
            write_line: function (str) {
                this.data += (str + '\n');
            },
            write: function (str) {
                this.data += str;
            },
            lines: function () {
                return this.data.split('\n');
            },
            clear: function () {
                this.data = '';
            }
        };

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
            let node = fs;
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

        const programs = {
            'clear': function (args) {
                history.clear();
                cursor.pos = prefix().length;
            },
            'howdy': function (args) {
                history.write_line('hi there!');
            },
            'echo': function (args) {
                let buf = '';
                for (let i = 0; i < args.length; i++) {
                    if (i > 0) {
                        buf += ' ';
                    }
                    buf += args[i]
                }
                history.write_line(buf);
            },
            'ls': function (args) {
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
                    history.write_line('not a directory: ' + path);
                    return;
                }
                let keys = Object.keys(node.nodes);
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i].substring(0, 1) !== '.' || all) {
                        if (list) {
                            history.write_line(node.nodes[keys[i]].type + '  ' + keys[i]);
                        } else {
                            history.write_line(keys[i]);
                        }
                    }
                }
            },
            'cd': function (args) {
                let path = args[0] || dir;
                path = resolve_path(dir, path);
                let node = find_node(path);
                if (node === undefined || node.type !== 'd') {
                    history.write_line('not a directory: ' + path);
                    return;
                }
                dir = path || '/';
            },
            'pwd': function (args) {
                history.write_line(dir)
            },
            'cat': function (args) {
                let path = args[0] || dir;
                path = resolve_path(dir, path);
                let node = find_node(path);
                if (node === undefined || node.type !== 'f') {
                    history.write_line('not a file: ' + path);
                    return;
                }
                history.write_line(node.content);
            },
            'mkdir': function (args) {
                let path = args[0];
                if (path === undefined) {
                    history.write_line('missing argument: path');
                    return;
                }
                path = resolve_path(dir, path);
                let parent = path.substring(0, path.lastIndexOf('/'));
                let child = path.substring(path.lastIndexOf('/') + 1);
                let node = find_node(parent);
                if (node === undefined || node.type !== 'd') {
                    history.write_line('not a directory: ' + path);
                    return;
                }
                node.nodes[child] = {
                    type: 'd',
                    nodes: {}
                };
            }
        }

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

        document.addEventListener('keydown', (e) => {
            cursor.freeze();
            let prefix_length = prefix().length;
            switch (e.key) {
                case 'Enter':
                    let command = text.substring(prefix_length);
                    history.write_line(text);
                    if (command.length === 0) {
                        break;
                    }
                    commands.push(command);
                    let command_parts = parse_command(command);
                    if (command_parts[0] in programs) {
                        programs[command_parts[0]]((command_parts.slice(1)));
                    } else {
                        history.write_line('command not found: ' + command_parts[0]);
                    }
                    text = prefix();
                    break;
                case 'Backspace':
                    cursor.move_left();
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
                        cursor.move_left();
                        if (cursor.pos < prefix_length) {
                            cursor.pos = prefix_length;
                        }
                    } else {
                        cursor.pos = prefix_length;
                    }
                    break;
                case 'ArrowRight':
                    if (!e.metaKey) {
                        cursor.move_right();
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
                    text = text.substring(0, cursor.pos) + e.key + text.substring(cursor.pos);
                    cursor.move_right();
                    if (cursor.pos > text.length) {
                        cursor.pos = text.length;
                    }
                    break;
            }
            cursor.blink();
        });

        cursor.pos = prefix().length;

        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.backgroundColor = this.background_color;
        const ctx = canvas.getContext('2d');
        let parent = document.getElementById(identifier);
        parent.appendChild(canvas);

        let main_loop = setInterval((function(that) { return () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (canvas.width !== that.width || canvas.height !== that.height) {
                canvas.width = that.width;
                canvas.height = that.height;
            }
            ctx.font = that.font_size + 'px ' + that.font_family;
            ctx.fillStyle = that.font_color;
            let row_count = 0;
            let column_count = 0;
            let lines = [''];
            let max_lines = Math.floor(canvas.height / (line_height + 1));
            for (let i = 0; i < history.data.length; i++) {
                if (history.data[i] === '\n' || Math.ceil(ctx.measureText(lines[row_count]).width) + 30 >= canvas.width) {
                    lines.push('');
                    row_count++;
                    column_count = 0;
                }
                if (history.data[i] === '\n') {
                    continue;
                }
                lines[row_count] += history.data[i];
                if (row_count + 1 > max_lines) {
                    lines.shift();
                    row_count--;
                }
            }
            let operation = text.substring(0, cursor.pos) + cursor.text() + text.substring(cursor.pos + 1);
            for (let i = 0; i < operation.length; i++) {
                if (Math.ceil(ctx.measureText(lines[row_count]).width) + 30 >= canvas.width) {
                    lines.push('');
                    row_count++;
                    column_count = 0;
                }
                lines[row_count] += operation[i];
                if (row_count + 1 > max_lines) {
                    lines.shift();
                    row_count--;
                }
            }
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], 10, line_height * (i + 1));
            }
        }}(this)), 10);
    }
}