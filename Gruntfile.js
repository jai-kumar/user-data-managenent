/*
 * Copyright (c) 2014, 2025 by Delphix. All rights reserved.
 */

const path = require('path'),
    async = require('async'),
    fs = require('fs'),
    exec = require('child_process').exec,
    jitGrunt = require('jit-grunt'),
    timeGrunt = require('time-grunt'),
    sass = require('sass'),
    WebpackBundleAnalyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
/**
 * Plugin used to provide libraries that were being expected in the global space.
 * @see https://webpack.js.org/plugins/provide-plugin/
 */
const ProvidePlugin = require('webpack/lib/ProvidePlugin');

/**
 * Plugin used to produce the split vendor bundle.
 * @see https://webpack.js.org/plugins/commons-chunk-plugin/
 */
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');

/**
 * Plugin used to apply minification with Webpack.
 * @see https://webpack.js.org/plugins/uglifyjs-webpack-plugin/
 */
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

/*
 * The main config for our grunt tasks. This expects to be run from (appliance/client/).
 *
 * This also exposes various properties through the grunt.config api which may be used by tasks defined in other files.
 */
module.exports = function(grunt) {
    const dxGuiPath = process.env.DXGUI_PATH;

    const currApp = process.env.GRUNT_APP;
    const currPath = process.env.GRUNT_PATH || currApp;
    /**
     * Since it's possible for some tasks (e.g. live-test) to run from within a module
     * within the admin-app, we need to make sure that we still resolve the output to
     * out/admin.
     */
    const isAdminApp = currPath.indexOf('admin/') !== -1;
    const currModule = isAdminApp ? 'admin' : currApp;

    // @see client/build.gradle for how these are passed.
    const shouldMinify = process.env.MINIFY === 'true';
    const shouldMinifyAngularBundle = process.env.MINIFY_ANGULAR === 'true';
    const shouldAnalyze = process.env.ANALYZE === 'true';
    const shouldUseProdSourceMap = process.env.PROD_SOURCEMAP === 'true';

    grunt.verbose.writeln('Defining tasks for app:', currApp);
    if (path.basename(process.cwd()) !== 'client') {
        grunt.fail.fatal(`Needs to be run from root client directory, but is being run from: ${process.cwd()}`);
    }
    const clientRoot = '.';
    const outDir = `${clientRoot}/out`;
    const appOutDir = path.join(outDir, currModule);

    // automatically figures out all npm dependencies to load
    jitGrunt(grunt, {
        ngtemplates: '@dlpx/grunt-angular-templates'
    });
    if (grunt.option('v') || grunt.option('verbose')) {
        timeGrunt(grunt);
    }

    /*
     * Set up config
     */

    const templatesSrc = [path.join(currPath, '**/*.hjs')];
    // Xplorer uses koWidget templates.
    if (currApp === 'xplorer') {
        templatesSrc.push(path.join('admin/koWidget', '**/*.hjs'));
    }

    const paths = {};
    paths[currApp] = {
        copySrc: [
            `${currPath}/**/*.{css,less,scss,ico,png,gif,ttf,woff,woff2,properties,map,svg}`,
            `${currPath}/**/lib/**/*.js`,
            `!${currPath}/**/testout/**`
        ],
        babelSrc: [
            `${currPath}/**/*.js`,
            `${currPath}/**/noTests-message.test`,
            `!${currPath}/**/{lib,testout}/**`
        ],
        indexHtmlSrc: [ `${currPath}/index.html` ],
        pseudolocalizeSrc: [ `${currPath}/**/messages_en_US.properties`],
        eslintSrc: [
            `${currPath}/**/*.js`,
            `${currPath}/**/noTests-message.test`,
            `!${currPath}/**/{lib,testout}/**`,
            '!*/build/**',
            '<%= clientRoot %>/Gruntfile.js', // gruntfile for root client dir
            '<%= apps %>/Gruntfile.js',
            '<%= clientRoot %>/tools/gruntTasks/*.js',
            '<%= clientRoot %>/tools/eslint/rules/*.js'
        ],
        cssSrc: [
            `${currPath}/**/*.css`,
            `!${currPath}/**/{lib,testout}/**`
        ],
        templatesSrc,
        templatesDest: path.join(appOutDir, 'templates.js'),
        allStyles: [
            `${currPath}/**/*.{less,css}`,
            `!${currPath}/**/{lib,testout}/**`
        ],
        sassStyles: [
            `${currPath}/**/*.scss`,
            `!${currPath}/**/{lib,testout}/**`
        ],
        docsSrc: [
            path.join(currPath, '/**/*.{js,ngdoc,less}'),
            `!${path.join(currPath, '/**/{lib,testout}/**')}`
        ]
    };

    // Expose properties through the config api.
    grunt.config.merge({
        clientRoot,
        outDir,
        paths
    });

    const webpackConfig = {
        options: {
            stats: {
                timings: true,
                hash: true,
                chunks: false,
                assets: false
            },
            devtool: shouldUseProdSourceMap ? 'sourcemap' : 'cheap-module-eval-source-map',
            resolve: {
                extensions: ['.ts', '.tsx', '.js'],
                alias: {
                    // Aliases to resolve all our compiled templates.
                    'admin-templates': path.resolve(outDir, 'admin/ngTemplates.js'),
                    'dx-core-templates': path.resolve(outDir, 'dxcore/ngTemplates.js'),
                    jqtree: path.resolve(clientRoot, 'api/lib/jqtree/tree.jquery.js'),
                    /**
                     * To prevent including different versions of the same library,
                     * we need to set an alias so that Webpack can resolve to the same place.
                     */
                    moment: require.resolve('moment'),
                    'moment-locales': path.resolve(clientRoot, 'node_modules/moment/min/locales.min.js'),
                    underscore: require.resolve('underscore'),
                    angular: require.resolve('angular'),
                    jquery: require.resolve('jquery'),
                    '@angular/animations/browser': require.resolve('@angular/animations/browser'),
                    '@angular/cdk/a11y': require.resolve('@angular/cdk/a11y'),
                    '@angular/cdk/accordion': require.resolve('@angular/cdk/accordion'),
                    '@angular/cdk/bidi': require.resolve('@angular/cdk/bidi'),
                    '@angular/cdk/clipboard': require.resolve('@angular/cdk/clipboard'),
                    '@angular/cdk/coercion': require.resolve('@angular/cdk/coercion'),
                    '@angular/cdk/collections': require.resolve('@angular/cdk/collections'),
                    '@angular/cdk/dialog': require.resolve('@angular/cdk/dialog'),
                    '@angular/cdk/keycodes': require.resolve('@angular/cdk/keycodes'),
                    '@angular/cdk/layout': require.resolve('@angular/cdk/layout'),
                    '@angular/cdk/observers/private': require.resolve('@angular/cdk/observers/private'),
                    '@angular/cdk/observers': require.resolve('@angular/cdk/observers'),
                    '@angular/core/primitives/signals': require.resolve('@angular/core/primitives/signals'),
                    '@angular/cdk/overlay': require.resolve('@angular/cdk/overlay'),
                    '@angular/cdk/platform': require.resolve('@angular/cdk/platform'),
                    '@angular/cdk/portal': require.resolve('@angular/cdk/portal'),
                    '@angular/cdk/scrolling': require.resolve('@angular/cdk/scrolling'),
                    '@angular/cdk/stepper': require.resolve('@angular/cdk/stepper'),
                    '@angular/cdk/table': require.resolve('@angular/cdk/table'),
                    '@angular/cdk/text-field': require.resolve('@angular/cdk/text-field'),
                    '@angular/cdk/tree': require.resolve('@angular/cdk/tree'),
                    '@angular/common/http': require.resolve('@angular/common/http'),
                    '@angular/material/autocomplete': require.resolve('@angular/material/autocomplete'),
                    '@angular/material/button': require.resolve('@angular/material/button'),
                    '@angular/material/card': require.resolve('@angular/material/card'),
                    '@angular/material/checkbox': require.resolve('@angular/material/checkbox'),
                    '@angular/material/chips': require.resolve('@angular/material/chips'),
                    '@angular/material/core': require.resolve('@angular/material/core'),
                    '@angular/material/datepicker': require.resolve('@angular/material/datepicker'),
                    '@angular/material/dialog': require.resolve('@angular/material/dialog'),
                    '@angular/material/divider': require.resolve('@angular/material/divider'),
                    '@angular/material/expansion': require.resolve('@angular/material/expansion'),
                    '@angular/material/form-field': require.resolve('@angular/material/form-field'),
                    '@angular/material/icon': require.resolve('@angular/material/icon'),
                    '@angular/material/input': require.resolve('@angular/material/input'),
                    '@angular/material/list': require.resolve('@angular/material/list'),
                    '@angular/material/menu': require.resolve('@angular/material/menu'),
                    '@angular/material/paginator': require.resolve('@angular/material/paginator'),
                    '@angular/material/progress-bar': require.resolve('@angular/material/progress-bar'),
                    '@angular/material/progress-spinner': require.resolve('@angular/material/progress-spinner'),
                    '@angular/material/radio': require.resolve('@angular/material/radio'),
                    '@angular/material/select': require.resolve('@angular/material/select'),
                    '@angular/material/snack-bar': require.resolve('@angular/material/snack-bar'),
                    '@angular/material/sort': require.resolve('@angular/material/sort'),
                    '@angular/material/table': require.resolve('@angular/material/table'),
                    '@angular/material/tabs': require.resolve('@angular/material/tabs'),
                    '@angular/material/toolbar': require.resolve('@angular/material/toolbar'),
                    '@angular/material/tooltip': require.resolve('@angular/material/tooltip'),
                    '@angular/material/tree': require.resolve('@angular/material/tree'),
                    '@angular/platform-browser/animations': require.resolve('@angular/platform-browser/animations'),
                    '@angular/platform-browser': require.resolve('@angular/platform-browser'),
                    '@angular/upgrade/static': require.resolve('@angular/upgrade/static'),
                    'apollo-angular/testing': require.resolve('apollo-angular/testing'),
                    /**
                     * Highstock library is required by highcharts-ng. As highstock library includes
                     * highcharts features but not vice versa, we create a 'highcharts' alias for both highcharts and
                     * highstock libraries by calling highstock.
                     */
                    highcharts: path.resolve(clientRoot, 'node_modules/highcharts/highstock.js'),
                    'highcharts-accessibility':
                        path.resolve(clientRoot, 'node_modules/highcharts/modules/accessibility.js'),
                    'highcharts-map': path.resolve(clientRoot, 'node_modules/highcharts/modules/map.js'),
                    'highcharts-no-data':
                        path.resolve(clientRoot, 'node_modules/highcharts/modules/no-data-to-display.js'),
                    /**
                     * We use the bootstrap-decorator for angular-schema-form. This module expects that
                     * an alias is set up for schemaForm, since it calls require('schemaForm').
                     *
                     * @see client/npm/angular-schema-form/README.md for more info on usages with Webpack.
                     */
                    schemaForm: require.resolve('@dlpx/angular-schema-form'),
                    dxcore: path.resolve(clientRoot, 'dxcore'),
                    dxtest: path.resolve(clientRoot, 'dxtest'),
                    client: path.resolve(clientRoot),
                    admin: path.resolve(clientRoot, 'admin'),
                    jetstream: path.resolve(clientRoot, 'jetstream'),
                    login: path.resolve(clientRoot, 'login')
                }
            },
            module: {
                rules: [{
                    // Explicit rule to run the linker over partial libraries
                    test: /.*\.mjs$/,
                    include: [
                        path.resolve(clientRoot, 'dxcore'),
                        path.resolve(clientRoot, 'dxtest'),
                        path.resolve(clientRoot, 'admin'),
                        path.resolve(clientRoot, 'jetstream'),
                        path.resolve(clientRoot, 'login'),
                        path.resolve(clientRoot, 'api'),
                        path.resolve(clientRoot, 'node_modules/@angular'),
                        path.resolve(clientRoot, 'node_modules/apollo-angular'),
                        path.resolve(clientRoot, 'node_modules/highcharts-angular'),
                        path.resolve(clientRoot, 'node_modules/@dlpx'),
                        path.resolve(clientRoot, 'node_modules/@delphix'),
                        path.resolve(clientRoot, 'node_modules/banana-i18n'),
                        path.resolve(clientRoot, 'node_modules/ngx-mat-timepicker')
                    ],
                    use: [{
                        loader: 'babel-loader',
                        options: {
                            configFile: false,
                            plugins: ['@angular/compiler-cli/linker/babel'],
                            presets: ['@babel/preset-env']
                        }
                    }]
                }, {
                    test: /\.mjs$/,
                    include: [
                        path.resolve(clientRoot, 'node_modules/apollo-angular')
                    ],
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    /*
                                     * Tell babel not to convert to commonJS modules. Webpack understands es2015
                                     * modules natively and they allow webpack to do tree shaking.
                                     */
                                    modules: false
                                }]
                            ],
                            // cache results to speed up future builds. By default uses node_modules/.cache/
                            cacheDirectory: true
                        }
                    }
                }, {
                    test: /\.mjs$/,
                    include: [
                        path.resolve(clientRoot, 'node_modules/@uirouter/angular'),
                        path.resolve(clientRoot, 'node_modules/@uirouter/angular-hybrid'),
                        path.resolve(clientRoot, 'node_modules/@angular/core'),
                        path.resolve(clientRoot, 'node_modules/@angular/material'),
                        path.resolve(clientRoot, 'node_modules/@angular/cdk'),
                        path.resolve(clientRoot, 'node_modules/@dlpx'),
                        path.resolve(clientRoot, 'node_modules/@delphix')
                    ],
                    use: [{
                        loader: 'babel-loader',
                        options: {
                            configFile: false,
                            plugins: ['@angular/compiler-cli/linker/babel'],
                            presets: ['@babel/preset-env']
                        }
                    }]
                }, {
                    test: /\.js$/,
                    include: [
                        path.resolve(clientRoot, 'node_modules/zone.js')
                    ],
                    use: [{
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }]
                }, {
                   // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
                    test: /\.tsx?$/,
                    loader: 'ts-loader'
                }, {
                    test: require.resolve('@dlpx/angular-schema-form'),
                    use: 'imports-loader?tv4=tv4,objectPath=objectpath'
                }, {
                    // Set define = false so it doesn't think it's an amd module.
                    test: require.resolve('backbone'),
                    use: 'imports-loader?define=>false'
                }, {
                    test: require.resolve(path.resolve(clientRoot, 'api/lib/jqtree/tree.jquery.js')),
                    use: 'imports-loader?jQuery=jquery,this=>window'
                }, {
                    test: /\.css$/,
                    loaders: [ 'style-loader', 'css-loader' ]
                }, {
                    test: /\.svg$/,
                    loader: 'svg-url-loader'
                }, {
                    /**
                     * We have several jquery plugins like datetimepickers and highcharts that expect
                     * expect jQuery in the global space.
                     */
                    test: require.resolve('jquery'),
                    use: [{
                        loader: 'expose-loader',
                        options: 'jQuery'
                    }, {
                        loader: 'expose-loader',
                        options: '$'
                    }]
                }, {
                    /**
                     * Expose angular for plugins that need it in the global space like highstock (old)
                     * or our templates themselves.
                     */
                    test: require.resolve('angular'),
                    use: [{
                        loader: 'expose-loader',
                        options: 'angular'
                    }]
                }, {
                    test: require.resolve('npm-modernizr'),
                    use: [{
                        loader: 'expose-loader',
                        options: 'Modernizr'
                    }, {
                        loader: 'imports-loader?this=>window!exports-loader?window.Modernizr'
                    }]
                }, {
                    test: [/\.js$/],
                    include: [
                        path.resolve(clientRoot, 'dxcore'),
                        path.resolve(clientRoot, 'dxtest'),
                        path.resolve(clientRoot, 'admin'),
                        path.resolve(clientRoot, 'jetstream'),
                        path.resolve(clientRoot, 'login'),
                        path.resolve(clientRoot, 'api'),
                        path.resolve(clientRoot, 'node_modules/@angular'),
                        path.resolve(clientRoot, 'node_modules/apollo-angular'),
                        path.resolve(clientRoot, 'node_modules/highcharts-angular'),
                        path.resolve(clientRoot, 'node_modules/@dlpx'),
                        path.resolve(clientRoot, 'node_modules/@delphix'),
                        path.resolve(clientRoot, 'node_modules/banana-i18n'),
                        path.resolve(clientRoot, 'node_modules/bootstrap'),
                        path.resolve(clientRoot, 'node_modules/@graphql-tools')
                    ],
                    // Exclude 3rd party libraries except the ones we wrote and banana-i18n, @angular, apollo-angular,
                    // highcharts-angular since they are compiled with es2015
                    exclude: [
                        `${currPath}/lib`,
                        // eslint-disable-next-line max-len
                        new RegExp(/node_modules\/((?!(@dlpx|@delphix|banana-i18n|@angular|apollo-angular|highcharts-angular|bootstrap|@graphql-tools)).*)/),
                        /dx-lib/
                    ],
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    /*
                                     * Tell babel not to convert to commonJS modules. Webpack understands es2015
                                     * modules natively and they allow webpack to do tree shaking.
                                     */
                                    modules: false
                                }]
                            ],
                            // cache results to speed up future builds. By default uses node_modules/.cache/
                            cacheDirectory: true
                        }
                    }
                }]
            },
            plugins: [
                new ProvidePlugin({
                    $: 'jquery',
                    jQuery: 'jquery',
                    'this.jQuery': 'jquery',
                    'window.jQuery': 'jquery',
                    tv4: 'tv4',
                    ngSanitize: 'angular-sanitize',
                    moment: 'moment'
                }),
                new CommonsChunkPlugin({
                    names: [
                        'adminShared',
                        'dxGUI',
                        'vendorAngular',
                        'vendor'
                    ],
                    minChunks: Infinity
                })
            ]
        }
    };

    if (shouldAnalyze) {
        webpackConfig.options.plugins.push(new WebpackBundleAnalyzer({analyzerPort: 'auto'}));
    }

    if (shouldMinifyAngularBundle) {
        webpackConfig.options.plugins.push(
            new UglifyJsPlugin({
                parallel: true,
                test: /(vendorAngular-bundle\.js)+/i
            })
        );
    }

    if (shouldMinify) {
        webpackConfig.options.plugins.push(
            new UglifyJsPlugin({
                parallel: true,
                /**
                 * "mangle" means to minify the variable names.
                 * This is a problem when it comes to angular since it relies on variable names
                 * for things like dependency injection and will effectively break the application if set true without
                 * explicitly marking the variables with something like ngInject.
                 */
                sourceMap: true,
                uglifyOptions: {
                    mangle: false
                }
            })
        );
    }

    // Task configuration.
    grunt.config.merge({
        watch: {
            options: {
                interval: 1000
            }
        },
        watchOptions: {
            ignored: '**/node_modules'
        },
        ngtemplates: {
            options: {
                htmlmin: {
                    collapseBooleanAttributes: true,
                    collapseWhitespace: true,
                    conservativeCollapse: false,
                    collapseInlineTagWhitespace: false,
                    removeAttributeQuotes: true,
                    removeComments: true, // Only if you don't use comment directives!
                    removeEmptyAttributes: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true
                }
            }
        },
        handlebars: {
            options: {
                namespace: 'dx.core._templates',
                // The key to be used in the dx.core._templates object for this template
                processName(filePath) {
                    return filePath.slice(0, -4); // chop off the file extension
                }
            }
        },
        autoprefixer: {
            options: {
                /*
                 * Add prefixes for any browser version which has greater than 1% of the usage share based on global
                 * usage statistics. Also assure the most recent two versions of each major browser are supported.
                 */
                browsers: ['> 1%', 'last 2 versions', 'ie 8', 'ie 9']
            }
        },
        eslint: {
            options: {
                configFile: 'tools/eslint/.eslintrc.js',
                cache: true
            }
        },
        webpack: webpackConfig
    });

    /*
     * Constants for use in the csslint config.
     * 'The csslint API is a bit awkward: For each rule, a value of false ignores the rule, a value of 2 will set it to
     * become an error. Otherwise all rules are considered warnings.'
     * - https://github.com/gruntjs/grunt-contrib-csslint
     */
    const IGNORE = false;
    const ERROR = 2;

    grunt.config.merge({
        csslint: {
            options: {
                format: 'compact',
                'duplicate-properties': ERROR,
                'empty-rules': ERROR,
                'known-properties': ERROR,
                'compatible-vendor-prefixes': ERROR,
                'non-link-hover': ERROR,
                'zero-units': ERROR,
                'display-property-grouping': ERROR,
                ids: IGNORE,
                'duplicate-background-images': IGNORE,
                'adjoining-classes': IGNORE,
                'box-sizing': IGNORE,
                'unqualified-attributes': IGNORE,
                'overqualified-elements': IGNORE,
                important: IGNORE,
                'regex-selectors': IGNORE,
                'box-model': IGNORE
            }
        }
    });

    let entry = {};
    switch (currApp) {
        case 'admin': // the "root" application
            entry = {
                admin: ['./admin/admin-app.js'],
                /**
                 * Define all 3rd party libraries that would need to be included here, for each application.
                 * Note that admin is a special case, since admin-shared and dxcore don't explciitly have entry points,
                 * they will be included in the vendor bundle
                 * Note 2: the order of this array ultimately determines the order of how the packages are loaded,
                 * therefore one must consider the correct loading order for certain types of vendor packages before
                 * adding / removing item(s) in this array. For example, polyfills should be loaded before any libs that
                 * would need to depend on it to function in older browsers (babel-polyfill, ag-grid in IE11 for
                 * example).
                 */
                vendor: [
                    'babel-polyfill',
                    'bootstrap',
                    'bootstrap-less-port',
                    'backbone',
                    'cronstrue',
                    'highcharts',
                    'highcharts-map',
                    'highcharts-no-data',
                    'ip-subnet-calculator',
                    'jquery',
                    'jsoneditor',
                    'knockout',
                    'moment',
                    'moment-duration-format',
                    'moment-timezone',
                    'npm-modernizr',
                    'objectpath',
                    'perfect-scrollbar',
                    'string-format-js',
                    'tv4',
                    'underscore',
                    'xregexp',
                    'ngx-mat-timepicker',
                    'xlsx',
                    'xlsx/dist/xlsx.mini.min'
                ],
                vendorAngular: [
                    '@angular/upgrade',
                    'ag-grid-community',
                    'angular',
                    'angular-animate',
                    'angular-messages',
                    'angular-moment',
                    'angular-sanitize',
                    'angular-schema-form',
                    'ui-bootstrap4',
                    '@uirouter/angular-hybrid',
                    'angular-ui-sortable',
                    'angular-ui-validate',
                    'ng-file-upload'
                ],
                dxGUI: [
                    '@delphix/dx-gui'
                ],
                adminShared: [
                    '@dlpx/admin-shared',
                    '@dlpx/admin-lib'
                ]
            };
            break;
        case 'jetstream':
            entry = {
                jetstream: ['./jetstream/js/main.js'],
                vendor: [
                    'babel-polyfill',
                    'backbone',
                    'bootstrap',
                    'bootstrap-less-port',
                    'jquery',
                    'knockout',
                    'moment',
                    'npm-modernizr',
                    'perfect-scrollbar',
                    'underscore',
                    'xregexp'
                ]
            };
            break;
        case 'login':
            entry = {
                login: ['./login/js/login.js'],
                vendor: [
                    'jquery',
                    'babel-polyfill',
                    'underscore',
                    'backbone',
                    'knockout',
                    'npm-modernizr',
                    'xregexp'
                ]
            };
            break;
        case 'api':
            entry = {
                api: ['./api/js/delphix-doc.js'],
                vendor: [
                    'jquery',
                    'underscore',
                    'bootstrap',
                    'bootstrap-less-port',
                    'backbone'
                ]
            };
            break;
        /*
         * fileList is reset in cases where currApp is either dxcore/dxtest since these are included as part of
         * the bundles for the other apps.
         */
        case 'dxcore':
            break;
        case 'dxtest':
            break;
    }

    /*
     * Loads the custom startup script based on the application corresponding to the filename passed in as a
     * parameter to the build. This implementation restricts the file being passed to contain the app name.
     */
    const loadTestFile = grunt.option('file');

    if (loadTestFile && (loadTestFile.indexOf(`${currPath}/`) !== -1)) {
        const customStartup = './debugout/dxcore/custom-startup.js';
        entry[currApp].push(customStartup);
    }

    /*
     * Register task configuration for the current app
     */

    const cfg = {
        ngtemplates: {},
        less: {},
        sass: {},
        autoprefixer: {},
        eslint: {},
        pseudolocalize: {},
        csslint: {},
        cssstyle: {},
        handlebars: {},
        isUptodate: {},
        watch: {},
        copy: {},
        clean: {},
        'replace-git-hash': {},
        webpack: {},
        delete_sync: {},
        sync: {}
    };

    if (Object.keys(entry).length > 0) {
        const output = {
            path: path.resolve(appOutDir, 'js'),
            filename: '[name]-bundle.js'
        };
        cfg.webpack[`build-${currApp}`] = {
            watch: false,
            entry,
            output
        };
        cfg.webpack[`dev-${currApp}`] = {
            watch: true,
            failOnError: false,
            entry,
            output
        };
    }

    cfg.ngtemplates[currApp] = {
        options: {
            standalone: true, // create a new module rather than add to an existing module
            module: `${currModule}-templates`
        },
        src: [
            path.join(currModule, '**/*.html'),
            `!${currModule}/**/{lib,testout}/**`,
            `!${path.join(currPath, 'index.html')}`
        ],
        dest: path.join(appOutDir, 'ngTemplates.js')
    };

    cfg.watch[`ngtemplates_${currApp}`] = {
        files: `<%= ngtemplates.${currApp}.src %>`,
        tasks: [ 'pause-proxy', `ngtemplates:${currApp}`, 'resume-proxy' ]
    };

    cfg.isUptodate[`ngtemplates_${currApp}`] = {
        src: `<%= ngtemplates.${currApp}.src %>`,
        dest: path.join(appOutDir, 'ngTemplates.js'),
        tasks: [ `ngtemplates:${currApp}` ]
    };

    cfg.eslint[currApp] = {
        options: {
            cacheFile: `.eslintcache-${currApp}`
        },
        src: `<%= paths.${currApp}.eslintSrc %>`
    };
    cfg.pseudolocalize[currApp] = {
        src: `<%= paths.${currApp}.pseudolocalizeSrc %>`
    };
    cfg.csslint[currApp] = {
        src: `<%= paths.${currApp}.cssSrc %>`
    };
    cfg.cssstyle[currApp] = {
        src: `<%= paths.${currApp}.cssSrc %>`
    };

    cfg.sass[currApp] = {
        options: {
            implementation: sass,
            outputStyle: 'compressed',
            includePaths: ['./node_modules'],
            // Custom importer to support webpack style tilde (~) imports
            importer: (url) => {
                if (url[0] === '~') url = path.resolve(process.cwd(), 'node_modules', url.substr(1));
                return {file: url};
            }
        },
        src: [ path.join(currPath, 'style/styles.scss') ],
        dest: path.join(appOutDir, 'style/styles-scss.css')
    };

    cfg.watch[`sass_styles_${currApp}`] = {
        files: `<%= paths.${currApp}.sassStyles %>`,
        tasks: [ 'pause-proxy', `sass:${currApp}`, 'resume-proxy' ]
    };

    cfg.isUptodate[`sass_styles_${currApp}`] = {
        src: `<%= paths.${currApp}.sassStyles %>`,
        dest: path.join(appOutDir, 'style/styles-scss.css'),
        tasks: [ `sass:${currApp}` ]
    };

    cfg.less[currApp] = {
        options: {
            compress: true,
            sourceMap: true,
            sourceMapFilename: path.join(appOutDir, 'style/styles.css.map'),
            // Prefix the "sources" paths in the sourcemap, as the browser looks relative
            // to the location of sourcemap.
            sourceMapRootpath: '../..',
            // URL for the source map itself
            sourceMapURL: `/${currPath}/style/styles.css.map`
        },
        src: [ path.join(currPath, 'style/styles.less') ],
        dest: path.join(appOutDir, 'style/styles.css')
    };

    cfg.watch[`styles_${currApp}`] = {
        files: `<%= paths.${currApp}.allStyles %>`,
        tasks: [ 'pause-proxy', `less:${currApp}`, `autoprefixer:${currApp}`, 'resume-proxy' ]
    };

    cfg.isUptodate[`styles_${currApp}`] = {
        src: `<%= paths.${currApp}.allStyles %>`,
        dest: path.join(appOutDir, 'style/styles.css'),
        tasks: [ `less:${currApp}`, `autoprefixer:${currApp}` ]
    };

    cfg.autoprefixer[currApp] = {
        options: {
            map: {
                // Updates the existing sourcemap generated by the "less" task.
                prev: path.join(appOutDir, 'style/'),
                inline: false
            }
        },
        files: [{
            expand: true, // creates a src->dest mapping for each source (n:n)
            src: `${appOutDir}/style/styles.css`,
            dest: '.' // happens in the out directory after less compilation has finished
        }]
    };
    cfg.handlebars[currApp] = {
        src: `<%= paths.${currApp}.templatesSrc %>`,
        dest: `<%= paths.${currApp}.templatesDest %>`
    };
    cfg.watch[`handlebars_${currApp}`] = {
        files: `<%= paths.${currApp}.templatesSrc %>`,
        tasks: [ 'pause-proxy', `handlebars:${currApp}`, 'resume-proxy' ]
    };
    cfg.isUptodate[`handlebars_${currApp}`] = {
        src: `<%= paths.${currApp}.templatesSrc %>`,
        dest: `<%= paths.${currApp}.templatesDest %>`,
        tasks: [ `handlebars:${currApp}` ]
    };
    /*
     * NOTE: We do not have a corresponding watch task for this on purpose. The watch task struggles with the number of
     * files we throw at it, and this would add a lot of files to watch with little benefit. The exception is locale
     * files, for which we've found watching to be useful.
     */
    cfg.copy[currApp] = {
        files: [{
            expand: true, // creates a src->dest mapping for each source (n:n)
            src: `<%= paths.${currApp}.copySrc %>`,
            dest: outDir,
            filter: 'isFile'
        },
        {
            cwd: `${clientRoot}/node_modules/@dlpx/dxDataSystem/lib`,
            src: '**/*.{js,css}',
            dest: `${outDir}/dxcore/lib/`,
            expand: true
        },
        {
            cwd: `${clientRoot}/node_modules/@dlpx/assets/themes/delphix/dx-icon/icons`,
            src: '**/*',
            dest: `${outDir}/dxcore/dx-cor-gui/shared/dx-icon/icons/`,
            expand: true
        },
        {
            cwd: `${clientRoot}/node_modules/@dlpx/assets/themes/delphix/product`,
            src: '**/*',
            dest: `${outDir}/admin/product/`,
            expand: true
        },
        {
            cwd: `${clientRoot}/node_modules/@dlpx/assets/themes/delphix/style/font`,
            src: '**/*.ttf',
            dest: `${outDir}/dxcore/style/font/`,
            expand: true
        },
        {
            cwd: `${clientRoot}/node_modules/@delphix/dx-gui/src/assets`,
            src: '**/*.svg',
            dest: `${outDir}/${currApp}/assets`,
            expand: true
        }]
    };
    // [Temporary] Watching changes in the custom less file in development environment and copying to out/.
    cfg.watch.dxcore_theme = {
        files: 'dxcore/theme/header.less',
        tasks: [ 'newer:copy:dxcore' ]
    };
    cfg.watch[`copy-locale_${currApp}`] = {
        files: `${currPath}/**/*.properties`,
        tasks: [ `newer:copy:${currApp}` ]
    };
    cfg.watch[`copy-images_${currApp}`] = {
        files: `${currPath}/**/*.svg`,
        tasks: [ `newer:copy:${currApp}` ]
    };
    cfg.clean[currApp] = {
        src: [ appOutDir, path.join(currPath, 'testout') ]
    };
    cfg['replace-git-hash'][currApp] = {
        files: [{
            expand: true, // creates a src->dest mapping for each source (n:n)
            src: `<%= paths.${currApp}.indexHtmlSrc %>`,
            dest: outDir
        }]
    };
    cfg.watch[`replace-git-hash_${currApp}`] = {
        files: `<%= paths.${currApp}.indexHtmlSrc %>`,
        tasks: [ 'pause-proxy', `replace-git-hash:${currApp}`, 'resume-proxy' ]
    };
    // Admin is a special case since it creates three different applications
    if (currApp === 'admin') {
        cfg['replace-git-hash'][currApp] = {
            files: [{
                expand: true, // creates a src->dest mapping for each source (n:n)
                src: ['admin/index.html', 'admin/Server.html', 'admin/ServerSetup.html', 'admin/Setup.html'],
                dest: outDir
            }]
        };
        cfg.watch[`replace-git-hash_${currApp}`] = {
            files: ['admin/index.html', 'admin/Server.html', 'admin/ServerSetup.html', 'admin/Setup.html'],
            tasks: [ 'pause-proxy', `replace-git-hash:${currApp}`, 'resume-proxy' ]
        };
    }
    cfg.delete_sync[currApp] = {
        cwd: appOutDir,
        src: [
            '**/*.js',
            '!lib/**/*.{js,css}',
            '!templates.js',
            '!ngTemplates.js',
            '!**/delphix-schema.js',
            '!js/*-bundle.js'
        ],
        syncWith: currPath
    };
    cfg.watch[`delete_sync_${currApp}`] = {
        files: `<%= paths.${currApp}.babelSrc %>`,
        tasks: ['delete_sync'],
        options: {
            event: 'deleted'
        }
    };
    // Pick up and automatically refresh upon changes to Delphix-owned libraries.
    if (dxGuiPath) {
        cfg.watch['dx-gui'] = {
            files: `${dxGuiPath}/projects/dx-gui/src/**`,
            tasks: [
                'pause-proxy',
                'rebuild-dx-gui',
                'sync:dx-gui',
                'rebuild-setup',
                'rebuild-server-setup',
                'resume-proxy'
            ]
        };
        cfg.sync['dx-gui'] = {
            files: [{
                // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
                cwd: `${dxGuiPath}/dist/dx-gui/`,
                src: '**',
                dest: `${clientRoot}/node_modules/@delphix/dx-gui`
            }, {
                // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
                cwd: `${dxGuiPath}/dist/dx-gui/`,
                src: '**',
                dest: `${clientRoot}/../webapp/node_modules/@delphix/dx-gui`
            }, {
                // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
                cwd: `${dxGuiPath}/dist/dx-gui/`,
                src: '**',
                dest: `${clientRoot}/../setup/node_modules/@delphix/dx-gui`
            }, {
                // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
                cwd: `${dxGuiPath}/dist/dx-gui/`,
                src: '**',
                dest: `${clientRoot}/../server-setup/node_modules/@delphix/dx-gui`
            }],
            updateAndDelete: true
        };
    }

    const webapps = ['assets', 'admin-lib', 'admin-shared', 'setup-lib', 'system-lib'];
    webapps.forEach((app) => {
        cfg.watch[app] = {
            files: `../webapp/projects/${app}/${app === 'assets' ? '' : 'src/'}**`,
            tasks: [
                'pause-proxy',
                `rebuild-${app}`,
                `sync:${app}`,
                ...app !== 'admin-lib' && app !== 'system-lib' ? ['rebuild-setup'] : [],
                ...app !== 'admin-lib' ? ['rebuild-server-setup'] : [],
                'sass:admin',
                'resume-proxy'
            ]
        };

        cfg.sync[app] = {
            files: [{
                cwd: `../webapp/dist/${app}/`, // Set relative cwd to not include /dist.. in the destination's path.
                src: '**',
                dest: `${clientRoot}/node_modules/@dlpx/${app}`
            }],
            updateAndDelete: true
        };

        if (app !== 'admin-lib') {
            cfg.sync[app].files.push({
                cwd: `../webapp/dist/${app}/`, // Set relative cwd to not include /dist.. in the destination's path.
                src: '**',
                dest: `../server-setup/node_modules/@dlpx/${app}`
            });
        }

        if (app !== 'admin-lib' && app !== 'system-lib') {
            cfg.sync[app].files.push({
                cwd: `../webapp/dist/${app}/`, // Set relative cwd to not include /dist.. in the destination's path.
                src: '**',
                dest: `../setup/node_modules/@dlpx/${app}`
            });
        }
    });

    cfg.watch.dxDataSystem = {
        files: [
            `${clientRoot}/npm/dxDataSystem/**/*`,
            `!${clientRoot}/npm/dxDataSystem/node_modules/**`,
            `!${clientRoot}/npm/dxDataSystem/dist/**`,
            `!${clientRoot}/npm/dxDataSystem/build/**`,
            `!${clientRoot}/npm/dxDataSystem/.gradle/**`,
            `!${clientRoot}/npm/dxDataSystem/coverage/**`
        ],
        tasks: [
            'pause-proxy',
            'rebuild-dxDataSystem',
            'sync:dxDataSystem',
            'rebuild-setup',
            'rebuild-server-setup',
            'resume-proxy'
        ]
    };

    cfg.sync.dxDataSystem = {
        files: [{
            // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
            cwd: `${clientRoot}/npm/dxDataSystem/dist/`,
            src: '**',
            dest: `${clientRoot}/node_modules/@dlpx/dxDataSystem`
        }, {
            // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
            cwd: `${clientRoot}/npm/dxDataSystem/dist/`,
            src: '**',
            dest: `${clientRoot}/../webapp/node_modules/@dlpx/dxDataSystem`
        }, {
            // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
            cwd: `${clientRoot}/npm/dxDataSystem/dist/`,
            src: '**',
            dest: `${clientRoot}/../setup/node_modules/@dlpx/dxDataSystem`
        }, {
            // Set relative cwd to not include /dist/dx-gui.. in the destination's path.
            cwd: `${clientRoot}/npm/dxDataSystem/dist/`,
            src: '**',
            dest: `${clientRoot}/../server-setup/node_modules/@dlpx/dxDataSystem`
        }],
        updateAndDelete: true
    };

    cfg.watch['server-setup'] = {
        files: [`${clientRoot}/../server-setup/src/**/*.{ts,html,scss}`],
        tasks: ['pause-proxy', 'rebuild-server-setup', 'resume-proxy']
    };

    cfg.watch.setup = {
        files: [`${clientRoot}/../setup/src/**/*.{ts,html,scss}`],
        tasks: ['pause-proxy', 'rebuild-setup', 'resume-proxy']
    };

    grunt.config.merge(cfg);

    /*
     * Register higher level tasks and aliases.
     */
    registerUptodateWrapperTask('uptodate-handlebars', 'handlebars');
    registerUptodateWrapperTask('uptodate-ngtemplates', 'ngtemplates');
    grunt.registerTask('templates', [ 'uptodate-handlebars', 'uptodate-ngtemplates' ]);
    registerUptodateWrapperTask('styles');
    registerUptodateWrapperTask('sass_styles');

    grunt.registerTask('checkstyle', [ 'eslint', 'csslint', 'cssstyle' ]);
    grunt.registerTask('check-messages',
        'check messages_en_US.properties files for line continuations', checkMessages());

    /*
     * Registers a multitask which wraps an 'isUptodate' target so 'grunt <name>' runs the corresponding isUptodate
     * target for the current app.
     */
    function registerUptodateWrapperTask(name, isUptodateTargetName) {
        isUptodateTargetName = isUptodateTargetName || name;
        // empty config just to register a target for the current app
        const config = {};
        config[name] = {};
        config[name][currApp] = {};
        grunt.config.merge(config);

        grunt.registerMultiTask(name, function() {
            grunt.task.run([`isUptodate:${isUptodateTargetName}_${this.target}`]);
        });
    }

    function pseudolocalize() {
        return function() {
            const done = this.async();

            const files = grunt.file.expand(this.filesSrc);
            const filesString = files.join(' '); // space-delimited string representation of files
            const psJarDir = '../../tools/ant/pseudolocalization';

            /*
             * Build out the command to run pseudolocalization on all files in filesString. We use xargs here to
             * avoid having to run the psedudolocalization command on each individual file, but rather give it a
             * file list that it can use.
             */
            const command = `echo ${filesString} | xargs java -cp ${
                path.join(psJarDir, 'pseudolocalization-0.2.jar')
            }${path.delimiter}${path.join(psJarDir, 'pseudolocalization-0.2-deps.jar')
            } com.google.i18n.pseudolocalization.tool.Pseudolocalizer --variant=psaccent`;

            grunt.verbose.writeln(command);

            // run ps command. this should pseudolocalize all files
            exec(command, (error, stdout) => {
                if (stdout) {
                    grunt.log.write(stdout);
                }
                if (error !== null) {
                    grunt.log.error(`Pseudolocalization failed: ${error}`);
                    done(false);
                }

                // clean up pseudolocalized file names and move to the appropriate directory
                const asyncTasks = files.map((fileName) => {
                    return function(callback) { // async passes a callback of the form function(error, result)
                        // Move our pseudolocalized file to the out directory
                        const psFileName = fileName.replace('messages_en_US.properties',
                            'messages_en_US_psaccent.properties');
                        const targetPsFileName = fileName.replace('messages_en_US.properties',
                            'messages_en_PS.properties');
                        const newPath = path.join(outDir, targetPsFileName);
                        grunt.verbose.writeln(`Moving ${psFileName} to ${newPath}`);
                        fs.rename(psFileName, newPath, (err) => {
                            if (err) throw err;
                            callback(null);
                        });
                    };
                });

                async.parallel(asyncTasks, (err) => {
                    if (err) {
                        done(false);
                    }
                    done();
                });
            });
        };
    }

    /**
     * Will check messages_en_US.properties files across client for any messages with line contiuations.
     * This is needed due to the tools/dlpx-translate tool which assumes that each message is on a single line.
     * This rule will ensure this assumption is met, and will fail if it is not met.
     */
    function checkMessages() {
        return function() {
            const done = this.async();

            const messageFiles = grunt.file.expand([
                `${clientRoot}/${currApp}/**/messages_en_US.properties`,
                `!${clientRoot}/out/**/*/messages_en_US.properties`
            ]);

            let processed = 0;
            const asyncTasks = messageFiles.map((filepath) => {
                return function(callback) {
                    /**
                     * Search for '\\$' (\ at the end of the line) within each message file.
                     * The regex is '\\\\$' because \ is typically used to escape characters.
                     */
                    exec(`grep '\\\\$' ${filepath}`, (err, stdout) => {
                        // For grep, anything > 1 for an error code means the command failed.
                        if (err && err.code > 1) {
                            callback(`checkMessages failed: ${err}`);
                        }

                        // Found continuation lines, fail
                        if (!err && stdout.length > 0) {
                            callback(`Found ${filepath} to have messages with line continuations:
                            ${stdout}
                            All messages with line continuations must be modified to be on a single line.`);
                        }

                        /**
                         * Grep will exit with code 1 for no match.
                         * In this case, it's actually good that it didn't match.
                         */
                        if (err && err.code === 1) {
                            processed++;
                            callback(null);
                        }
                    });
                };
            });

            async.parallel(asyncTasks, (err) => {
                if (err) {
                    grunt.fail.fatal(err);
                }

                grunt.log.write(`check-messages succeded with ${processed} files!`);
                done();
            });
        };
    }

    function makePerlTask(scriptName) {
        return function() {
            const done = this.async();

            const scriptBin = path.join(clientRoot, '../../tools/build', scriptName);
            const perlBin = 'perl';
            const files = grunt.file.expand(this.filesSrc);

            const asyncTasks = files.map((fileName) => {
                return function(callback) { // async passes a callback of the form function(error, result)
                    const cmd = `${perlBin} ${scriptBin} ${fileName}`;
                    exec(cmd, (error, stdout) => {
                        if (stdout) {
                            grunt.log.write(`[${scriptName} stdout]: ${stdout}`);
                        }
                        if (error !== null) {
                            grunt.log.error(`${scriptName} failed: ${error}`);
                            callback(error);
                        }
                        callback(null);
                    });
                };
            });

            async.parallel(asyncTasks, (err) => {
                if (err) {
                    done(false);
                }
                done();
            });
        };
    }

    grunt.registerMultiTask('cssstyle', 'Validate css files with cssstyle', makePerlTask('cssstyle'));
    grunt.registerMultiTask('pseudolocalize', 'Pseudolocalize properties files', pseudolocalize());

    grunt.registerTask('prepare-testing', 'Do necessary build steps to run unit tests', () => {
        /*
         * By default, this gets run in the directory of the app being tested, and thus we've only loaded task
         * configuration for that app. To make sure we've run "copy" and "templates" in dxcore and dxtest, we need to
         * load the configuration for those directories. Then, grunt will automatically include those targets when
         * iterating over the multitasks below.
         */
        if (currApp !== 'dxcore') {
            grunt.file.setBase('dxcore');
            /**
             * Reset the environment variable for any nested modules Gruntfile.js
             * This is neccessary because otherwise it will not properly resolve tasks like templates.
             */
            process.env.GRUNT_PATH = '';
            /* eslint-disable global-require */
            require(`${process.cwd()}/Gruntfile.js`)(grunt);
            /* eslint-enable global-require */
        }

        if (currApp !== 'dxtest') {
            grunt.file.setBase('dxtest');
            process.env.GRUNT_PATH = '';
            /* eslint-disable global-require */
            require(`${process.cwd()}/Gruntfile.js`)(grunt);
            /* eslint-enable global-require */
        }

        grunt.task.run(['isUptodate:schemas', 'newer:copy', 'templates']);
    });
};
