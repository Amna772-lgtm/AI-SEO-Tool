/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/App.jsx"
/*!*********************!*\
  !*** ./src/App.jsx ***!
  \*********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ App)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _components_ConnectionScreen__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./components/ConnectionScreen */ "./src/components/ConnectionScreen.jsx");
/* harmony import */ var _components_DashboardScreen__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/DashboardScreen */ "./src/components/DashboardScreen.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__);
/**
 * AI SEO Tool — Root App Component
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */




function App() {
  const initialPage = document.getElementById('ai-seo-tool-root')?.dataset?.page || 'ai-seo-tool';
  const [connected, setConnected] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(window.aiSeoTool?.connected || false);
  const [currentPage] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(initialPage);
  if (!connected) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_components_ConnectionScreen__WEBPACK_IMPORTED_MODULE_1__["default"], {
      onConnected: () => setConnected(true)
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_components_DashboardScreen__WEBPACK_IMPORTED_MODULE_2__["default"], {
    currentPage: currentPage,
    onDisconnected: () => setConnected(false)
  });
}

/***/ },

/***/ "./src/components/AnalysisProgress.jsx"
/*!*********************************************!*\
  !*** ./src/components/AnalysisProgress.jsx ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ AnalysisProgress)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);
/**
 * AI SEO Tool — Analysis Progress Bar
 * Shows progress bar with phase labels during analysis.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */



const PHASES = {
  pending: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Crawling', 'ai-seo-tool'),
    pct: 33
  },
  crawling: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Crawling', 'ai-seo-tool'),
    pct: 33
  },
  technical: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Technical Checks', 'ai-seo-tool'),
    pct: 66
  },
  geo: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('GEO Analysis', 'ai-seo-tool'),
    pct: 90
  },
  completed: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Complete', 'ai-seo-tool'),
    pct: 100
  }
};

/**
 * @param {Object} props
 * @param {string} props.status - Job status from polling hook.
 */
function AnalysisProgress({
  status
}) {
  const phase = PHASES[status] || PHASES.pending;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    style: {
      padding: '16px 0'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      style: {
        fontSize: '13px',
        fontWeight: 600,
        marginBottom: '8px'
      },
      children: phase.label
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      role: "progressbar",
      "aria-valuenow": phase.pct,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Analysis progress', 'ai-seo-tool'),
      style: {
        height: '8px',
        borderRadius: '4px',
        backgroundColor: '#c3c4c7',
        overflow: 'hidden'
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        style: {
          height: '100%',
          width: `${phase.pct}%`,
          backgroundColor: '#0d9488',
          borderRadius: '4px',
          transition: 'width 0.4s ease'
        }
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("span", {
        style: {
          fontSize: '13px',
          color: '#757575'
        },
        children: [phase.label, "..."]
      })]
    })]
  });
}

/***/ },

/***/ "./src/components/ConnectionScreen.jsx"
/*!*********************************************!*\
  !*** ./src/components/ConnectionScreen.jsx ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ConnectionScreen)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__);
/**
 * AI SEO Tool — Connection Screen
 * Two-panel connection layout matching the AI SEO Tool brand design.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */





const SparkleIcon = ({
  size = 24,
  color = 'currentColor'
}) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("path", {
    d: "M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z",
    fill: color
  })
});
const ShieldIcon = ({
  size = 16,
  color = 'currentColor'
}) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("path", {
    d: "M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z",
    fill: color
  })
});
const ChartIcon = ({
  size = 16,
  color = 'currentColor'
}) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("polyline", {
    points: "22 7 13.5 15.5 8.5 10.5 2 17",
    stroke: color,
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("polyline", {
    points: "16 7 22 7 22 13",
    stroke: color,
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })]
});
const FeatureItem = ({
  icon,
  label
}) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
    style: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'rgba(13,148,136,0.35)',
      border: '1px solid rgba(94,234,212,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: '15px'
    },
    children: icon
  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#e2e8f0'
    },
    children: label
  })]
});

/**
 * Connection screen component.
 *
 * @param {Object}   props
 * @param {Function} props.onConnected - Called when connection succeeds.
 */
function ConnectionScreen({
  onConnected
}) {
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const heading = document.querySelector('.wrap > h1, .wrap > h2');
    if (heading) heading.style.display = 'none';
    return () => {
      if (heading) heading.style.display = '';
    };
  }, []);
  const [apiKey, setApiKey] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [connecting, setConnecting] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [testing, setTesting] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [showKey, setShowKey] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [testResult, setTestResult] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setTestResult(null);
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/ai-seo-tool/v1/connect',
        method: 'POST',
        data: {
          api_key: apiKey
        }
      });
      if (response && response.status === 'connected') {
        onConnected();
      } else {
        setError((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Connection failed. Please check your API key and try again.', 'ai-seo-tool'));
      }
    } catch (err) {
      const code = err.code || err.status;
      if (code === 401 || err.message?.includes('401')) {
        setError((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Invalid API key. Generate a key from your AI SEO Tool account under Settings → API Keys.', 'ai-seo-tool'));
      } else {
        setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Connection failed. Please check your API key and try again.', 'ai-seo-tool'));
      }
    } finally {
      setConnecting(false);
    }
  };
  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/ai-seo-tool/v1/connect',
        method: 'POST',
        data: {
          api_key: apiKey
        }
      });
      if (response && response.status === 'connected') {
        setTestResult('success');
      } else {
        setTestResult('fail');
      }
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };
  const isDisabled = !apiKey.trim() || connecting;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    style: {
      position: 'relative',
      height: '85vh',
      background: '#f0f4f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      boxSizing: 'border-box'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
      style: {
        position: 'absolute',
        top: '-80px',
        right: '-80px',
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
      style: {
        position: 'absolute',
        bottom: '-60px',
        left: '-60px',
        width: '220px',
        height: '220px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      style: {
        position: 'absolute',
        top: '20px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        style: {
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: '#94a3b8',
          display: 'inline-block'
        }
      }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Not connected', 'ai-seo-tool')]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
      style: {
        display: 'flex',
        width: '100%',
        maxWidth: '650px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        position: 'relative',
        zIndex: 1
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        style: {
          flex: 1,
          background: '#fff',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          style: {
            marginBottom: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
            style: {
              margin: '0 0 6px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#0d9488'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('GET STARTED', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("h3", {
            style: {
              margin: '0 0 8px',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-.4px',
              color: '#0f172a'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Connect to AI SEO Tool', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
            style: {
              margin: 0,
              fontSize: '13px',
              color: '#64748b',
              lineHeight: 1.55
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Enter your API key to connect this WordPress site to your AI SEO Tool account.', 'ai-seo-tool')
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          style: {
            marginBottom: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '7px'
            },
            children: ["\uD83D\uDD11 ", (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('API Key', 'ai-seo-tool'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
              title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Find your API key in Account → API & Integrations', 'ai-seo-tool'),
              style: {
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#64748b',
                cursor: 'help',
                flexShrink: 0
              },
              children: "?"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
            style: {
              position: 'relative'
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
              type: showKey ? 'text' : 'password',
              placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Paste your API key here', 'ai-seo-tool'),
              value: apiKey,
              onChange: e => setApiKey(e.target.value),
              disabled: connecting,
              style: {
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 40px 10px 14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '9px',
                fontSize: '13px',
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
                transition: 'border-color .15s'
              },
              onFocus: e => {
                e.target.style.borderColor = '#0d9488';
              },
              onBlur: e => {
                e.target.style.borderColor = '#e2e8f0';
              }
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
              type: "button",
              onClick: () => setShowKey(!showKey),
              style: {
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: 0,
                fontSize: '14px',
                lineHeight: 1
              },
              title: showKey ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Hide key', 'ai-seo-tool') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Show key', 'ai-seo-tool'),
              children: showKey ? '🙈' : '👁'
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: 'rgba(13,148,136,0.07)',
              border: '1px solid rgba(13,148,136,0.2)',
              borderRadius: '8px',
              padding: '9px 13px',
              marginTop: '10px',
              fontSize: '12px',
              color: '#0f766e',
              lineHeight: 1.5
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
              style: {
                flexShrink: 0
              },
              children: "\uD83D\uDCCD"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Tip: Find your API key in Account → Settings on app.aiseotool.com.', 'ai-seo-tool')
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
          type: "button",
          onClick: handleConnect,
          disabled: isDisabled,
          style: {
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: isDisabled ? '#e2e8f0' : 'linear-gradient(135deg, #0d9488, #0ea5e9)',
            color: isDisabled ? '#94a3b8' : '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isDisabled ? 'none' : '0 4px 14px rgba(13,148,136,0.35)',
            transition: 'opacity .15s',
            marginBottom: '12px'
          },
          children: connecting ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {
              style: {
                margin: 0
              }
            }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Connecting…', 'ai-seo-tool')]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.Fragment, {
            children: ["\uD83D\uDD17 ", (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Connect Account', 'ai-seo-tool')]
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
            style: {
              flex: 1,
              height: '1px',
              background: '#e2e8f0'
            }
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
            style: {
              fontSize: '11px',
              color: '#94a3b8',
              fontWeight: 600,
              letterSpacing: '.5px'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('OR', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
            style: {
              flex: 1,
              height: '1px',
              background: '#e2e8f0'
            }
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
          style: {
            textAlign: 'center',
            marginBottom: '20px'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
            style: {
              margin: '0 0 6px',
              fontSize: '13px',
              color: '#374151'
            },
            children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)("Don't have an account?", 'ai-seo-tool'), ' ', /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("a", {
              href: "http://localhost:3000/signup",
              target: "_blank",
              rel: "noreferrer",
              style: {
                color: '#0d9488',
                fontWeight: 700,
                textDecoration: 'none'
              },
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sign up →', 'ai-seo-tool')
            })]
          })
        }), error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          style: {
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#dc2626',
            marginBottom: '16px'
          },
          children: ["\u26A0 ", error]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9'
          },
          children: [{
            icon: '🔒',
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('SSL encrypted', 'ai-seo-tool')
          }, {
            icon: '👁',
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Read-only access', 'ai-seo-tool')
          }, {
            icon: '⏱',
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Setup in 60s', 'ai-seo-tool')
          }].map(badge => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: 500
            },
            children: [badge.icon, " ", badge.label]
          }, badge.label))
        })]
      })
    })]
  });
}

/***/ },

/***/ "./src/components/DashboardScreen.jsx"
/*!********************************************!*\
  !*** ./src/components/DashboardScreen.jsx ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DashboardScreen)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _hooks_usePlan__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../hooks/usePlan */ "./src/hooks/usePlan.js");
/* harmony import */ var _hooks_useAnalysis__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../hooks/useAnalysis */ "./src/hooks/useAnalysis.js");
/* harmony import */ var _AnalysisProgress__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./AnalysisProgress */ "./src/components/AnalysisProgress.jsx");
/* harmony import */ var _tabs_DashboardTab__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./tabs/DashboardTab */ "./src/components/tabs/DashboardTab.jsx");
/* harmony import */ var _tabs_GeoAnalysisTab__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./tabs/GeoAnalysisTab */ "./src/components/tabs/GeoAnalysisTab.jsx");
/* harmony import */ var _tabs_TechnicalAuditTab__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./tabs/TechnicalAuditTab */ "./src/components/tabs/TechnicalAuditTab.jsx");
/* harmony import */ var _tabs_HistoryTab__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./tabs/HistoryTab */ "./src/components/tabs/HistoryTab.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__);
/**
 * AI SEO Tool — Dashboard Screen
 * Main dashboard with account info, analyze button, progress, and result tabs.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */












/** Maps WP admin sub-menu slug to tab name. */

const PAGE_TO_TAB = {
  'ai-seo-tool': 'dashboard',
  'ai-seo-tool-geo': 'geo',
  'ai-seo-tool-technical': 'technical',
  'ai-seo-tool-history': 'history',
  'ai-seo-tool-settings': 'settings'
};
const SESSION_KEY_SITE_ID = 'ai_seo_tool_site_id';
const SESSION_KEY_COMPLETE = 'ai_seo_tool_analysis_complete';
const SESSION_KEY_SCAN_TS = 'ai_seo_tool_scan_ts';
function getRelativeTime(ts) {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('just now', 'ai-seo-tool');
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__._n)('%d min ago', '%d mins ago', m, 'ai-seo-tool'), m);
  }
  const h = Math.floor(diff / 3600);
  return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__._n)('%d hr ago', '%d hrs ago', h, 'ai-seo-tool'), h);
}

/**
 * @param {Object}   props
 * @param {string}   props.currentPage    - Active WP sub-menu slug.
 * @param {Function} props.onDisconnected - Called after disconnect action.
 */
// ─── Top header bar ──────────────────────────────────────────────────────────

function AppHeader({
  plan
}) {
  const name = plan?.name || plan?.email?.split('@')[0] || '—';
  const email = plan?.email || '';
  const initial = (name[0] || 'U').toUpperCase();
  const planLabel = plan?.plan || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Free', 'ai-seo-tool');
  const auditCount = plan?.audit_count ?? 0;
  const auditLimit = plan?.audit_limit;
  const isUnlimited = auditLimit === null || auditLimit === undefined;
  const usageLabel = isUnlimited ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%d / Unlimited audits used', 'ai-seo-tool'), auditCount) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d / %2$d audits used', 'ai-seo-tool'), auditCount, auditLimit);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '24px',
      marginLeft: '-20px',
      marginRight: '-20px',
      marginTop: '-8px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("svg", {
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "#0d9488",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("path", {
          d: "M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z"
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
        style: {
          fontSize: '16px',
          fontWeight: 700,
          color: '#0f172a',
          letterSpacing: '-0.3px'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('AI SEO Tool', 'ai-seo-tool')
      })]
    }), plan && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
          style: {
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            flexShrink: 0
          },
          children: initial
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          style: {
            lineHeight: 1.3
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            style: {
              fontSize: '13px',
              fontWeight: 600,
              color: '#1e293b'
            },
            children: name
          }), email && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            style: {
              fontSize: '11px',
              color: '#94a3b8'
            },
            children: email
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
        style: {
          padding: '3px 10px',
          borderRadius: '12px',
          background: '#ccfbf1',
          color: '#0f766e',
          fontSize: '11px',
          fontWeight: 700,
          border: '1px solid #99f6e4'
        },
        children: planLabel
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
        style: {
          fontSize: '12px',
          color: '#64748b',
          fontWeight: 500
        },
        children: usageLabel
      })]
    })]
  });
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen({
  currentPage,
  onDisconnected
}) {
  const {
    plan,
    loading: planLoading,
    error: planError
  } = (0,_hooks_usePlan__WEBPACK_IMPORTED_MODULE_4__["default"])();
  const [siteId, setSiteIdState] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(() => sessionStorage.getItem(SESSION_KEY_SITE_ID) || null);
  const [analysisComplete, setAnalysisCompleteState] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(() => sessionStorage.getItem(SESSION_KEY_COMPLETE) === 'true');
  const [analyzeError, setAnalyzeError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [disconnecting, setDisconnecting] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [scanTs, setScanTs] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(() => parseInt(sessionStorage.getItem(SESSION_KEY_SCAN_TS) || '0', 10) || null);
  const [, forceUpdate] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(0);

  // Refresh the "last scan" relative time every 30s
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!scanTs) return;
    const id = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(id);
  }, [scanTs]);
  const setSiteId = id => {
    if (id) sessionStorage.setItem(SESSION_KEY_SITE_ID, id);else sessionStorage.removeItem(SESSION_KEY_SITE_ID);
    setSiteIdState(id);
  };
  const setAnalysisComplete = val => {
    if (val) {
      sessionStorage.setItem(SESSION_KEY_COMPLETE, 'true');
      const ts = Date.now();
      sessionStorage.setItem(SESSION_KEY_SCAN_TS, String(ts));
      setScanTs(ts);
    } else {
      sessionStorage.removeItem(SESSION_KEY_COMPLETE);
      sessionStorage.removeItem(SESSION_KEY_SCAN_TS);
      setScanTs(null);
    }
    setAnalysisCompleteState(val);
  };
  const {
    status,
    data: analysisData,
    error: pollError,
    reset: resetAnalysis
  } = (0,_hooks_useAnalysis__WEBPACK_IMPORTED_MODULE_5__["default"])(siteId);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (status === 'expired') {
      setSiteId(null);
      setAnalysisComplete(false);
      resetAnalysis();
    }
  }, [status]);
  const isFailed = status === 'failed';
  const isRunning = siteId && status && status !== 'completed' && status !== 'failed';
  const isComplete = status === 'completed' || analysisComplete;
  if (status === 'completed' && !analysisComplete) {
    setAnalysisComplete(true);
  }

  // Hide the default WP admin page heading — our AppHeader replaces it
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const heading = document.querySelector('.wrap > h1, .wrap > h2');
    if (heading) heading.style.display = 'none';
    return () => {
      if (heading) heading.style.display = '';
    };
  }, []);
  if (currentPage === 'ai-seo-tool-settings') {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(AppHeader, {
        plan: plan
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(SettingsPage, {
        onDisconnected: onDisconnected,
        disconnecting: disconnecting,
        setDisconnecting: setDisconnecting
      })]
    });
  }
  const handleAnalyze = async () => {
    setAnalyzeError(null);
    resetAnalysis();
    setAnalysisComplete(false);
    setSiteId(null);
    try {
      const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/ai-seo-tool/v1/analyze',
        method: 'POST',
        data: {
          url: window.aiSeoTool?.siteUrl
        }
      });
      setSiteId(response.site_id || response.id);
    } catch (err) {
      const code = err.code || err.status;
      if (code === 402) {
        setAnalyzeError((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)("You've reached your audit quota. Upgrade your plan to run more audits.", 'ai-seo-tool'));
      } else {
        setAnalyzeError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed to start analysis. Please try again.', 'ai-seo-tool'));
      }
    }
  };
  const handleTryAgain = () => {
    setSiteId(null);
    setAnalysisComplete(false);
    resetAnalysis();
    setAnalyzeError(null);
  };
  const quotaExhausted = plan && plan.audit_limit !== null && plan.audit_limit !== undefined && plan.audit_count >= plan.audit_limit;
  const auditCount = plan?.audit_count ?? 0;
  const auditLimit = plan?.audit_limit;
  const isUnlimited = auditLimit === null || auditLimit === undefined;
  const usagePct = isUnlimited ? 0 : Math.min(auditCount / auditLimit * 100, 100);
  const siteUrl = window.aiSeoTool?.siteUrl || '';
  const domain = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const lastScan = scanTs ? getRelativeTime(scanTs) : null;
  const initialTabName = PAGE_TO_TAB[currentPage] || 'dashboard';
  const tabs = [{
    name: 'dashboard',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Dashboard', 'ai-seo-tool')
  }, {
    name: 'geo',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('GEO Analysis', 'ai-seo-tool')
  }, {
    name: 'technical',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Technical Audit', 'ai-seo-tool')
  }, {
    name: 'history',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('History', 'ai-seo-tool')
  }];
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    style: {
      marginTop: '0'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(AppHeader, {
      plan: plan
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      style: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '28px 32px',
        marginBottom: '24px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      },
      children: planLoading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 0'
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
          style: {
            color: '#6b7280',
            fontSize: '13px'
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading account info…', 'ai-seo-tool')
        })]
      }) : planError ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
        status: "error",
        isDismissible: false,
        children: planError
      }) : plan ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
        children: [domain && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '4px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "#6b7280",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("circle", {
              cx: "12",
              cy: "12",
              r: "10"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("line", {
              x1: "2",
              y1: "12",
              x2: "22",
              y2: "12"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("path", {
              d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
            style: {
              fontWeight: 600,
              fontSize: '14px',
              color: '#1e293b'
            },
            children: domain
          }), lastScan && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
            style: {
              color: '#94a3b8',
              fontSize: '12px'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Last scan: %s', 'ai-seo-tool'), lastScan)
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
          style: {
            color: '#6b7280',
            fontSize: '13px',
            margin: '4px 0 20px'
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Run a full GEO + Technical audit', 'ai-seo-tool')
        }), quotaExhausted ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
            status: "warning",
            isDismissible: false,
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)("You've used all %d audits this period. Upgrade your plan to run more audits.", 'ai-seo-tool'), plan.audit_limit)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
            variant: "primary",
            onClick: () => window.open('http://localhost:3000/select-plan', '_blank'),
            style: {
              marginTop: '12px',
              backgroundColor: '#0d9488',
              borderColor: '#0d9488'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Upgrade Plan', 'ai-seo-tool')
          })]
        }) : isRunning ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_AnalysisProgress__WEBPACK_IMPORTED_MODULE_6__["default"], {
          status: status
        }) : isFailed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
            status: "error",
            isDismissible: false,
            children: pollError || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Audit failed. Check the AI SEO Tool backend logs for details.', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
            variant: "secondary",
            onClick: handleTryAgain,
            style: {
              marginTop: '12px'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Try Again', 'ai-seo-tool')
          })]
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [analyzeError && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
            status: "error",
            isDismissible: false,
            style: {
              marginBottom: '12px'
            },
            children: analyzeError
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("button", {
            onClick: handleAnalyze,
            disabled: quotaExhausted,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 36px',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: quotaExhausted ? 'not-allowed' : 'pointer',
              opacity: quotaExhausted ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(13,148,136,0.35)',
              transition: 'opacity 0.15s, box-shadow 0.15s',
              minWidth: '220px'
            },
            onMouseEnter: e => {
              if (!quotaExhausted) e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,0.5)';
            },
            onMouseLeave: e => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,148,136,0.35)';
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("svg", {
              width: "14",
              height: "14",
              viewBox: "0 0 24 24",
              fill: "currentColor",
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("path", {
                d: "M12 2L9.5 8.5 3 11l6.5 2.5L12 22l2.5-8.5L21 11l-6.5-2.5z"
              })
            }), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Analyze This Site', 'ai-seo-tool')]
          })]
        }), !isRunning && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          style: {
            marginTop: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            style: {
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '6px'
            },
            children: isUnlimited ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%d of Unlimited audits used this month', 'ai-seo-tool'), auditCount) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d of %2$d audits used this month', 'ai-seo-tool'), auditCount, auditLimit)
          }), !isUnlimited && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            style: {
              height: '4px',
              background: '#e2e8f0',
              borderRadius: '2px',
              maxWidth: '280px',
              margin: '0 auto'
            },
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
              style: {
                height: '100%',
                width: `${usagePct}%`,
                background: usagePct >= 90 ? '#dc2626' : '#0d9488',
                borderRadius: '2px',
                transition: 'width 0.3s'
              }
            })
          })]
        })]
      }) : null
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
      tabs: tabs,
      initialTabName: initialTabName,
      children: tab => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
        style: {
          padding: '24px 0'
        },
        children: isComplete ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [tab.name === 'dashboard' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_tabs_DashboardTab__WEBPACK_IMPORTED_MODULE_7__["default"], {
            siteId: siteId,
            data: analysisData,
            plan: plan
          }), tab.name === 'geo' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_tabs_GeoAnalysisTab__WEBPACK_IMPORTED_MODULE_8__["default"], {
            siteId: siteId,
            plan: plan
          }), tab.name === 'technical' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_tabs_TechnicalAuditTab__WEBPACK_IMPORTED_MODULE_9__["default"], {
            siteId: siteId,
            plan: plan
          }), tab.name === 'history' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_tabs_HistoryTab__WEBPACK_IMPORTED_MODULE_10__["default"], {
            plan: plan
          })]
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: tab.name === 'history' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_tabs_HistoryTab__WEBPACK_IMPORTED_MODULE_10__["default"], {
            plan: plan
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(EmptyState, {})
        })
      })
    })]
  });
}
function EmptyState() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    style: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '64px 32px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      style: {
        width: '56px',
        height: '56px',
        background: '#f0fdfa',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px'
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("svg", {
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#0d9488",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("circle", {
          cx: "11",
          cy: "11",
          r: "8"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("line", {
          x1: "21",
          y1: "21",
          x2: "16.65",
          y2: "16.65"
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h3", {
      style: {
        margin: '0 0 8px',
        fontSize: '16px',
        fontWeight: 600,
        color: '#1e293b'
      },
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No audits yet', 'ai-seo-tool')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
      style: {
        color: '#6b7280',
        fontSize: '13px',
        margin: 0,
        maxWidth: '320px',
        marginLeft: 'auto',
        marginRight: 'auto'
      },
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)("Click 'Analyze This Site' above to run your first GEO citation readiness audit.", 'ai-seo-tool')
    })]
  });
}
function SettingsPage({
  onDisconnected,
  disconnecting,
  setDisconnecting
}) {
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: '/ai-seo-tool/v1/disconnect',
        method: 'POST'
      });
      onDisconnected();
    } catch (err) {
      setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed to disconnect. Please try again.', 'ai-seo-tool'));
      setDisconnecting(false);
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
    style: {
      marginTop: '24px',
      maxWidth: '480px'
    },
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardHeader, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
          style: {
            margin: 0
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Settings', 'ai-seo-tool')
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
        style: {
          padding: '24px'
        },
        children: [window.aiSeoTool?.mainAppUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          style: {
            marginBottom: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            style: {
              fontSize: '11px',
              color: '#757575',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '4px'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Backend URL', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("code", {
            style: {
              fontSize: '13px'
            },
            children: window.aiSeoTool.mainAppUrl
          })]
        }), error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
          status: "error",
          isDismissible: false,
          style: {
            marginBottom: '12px'
          },
          children: error
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
          variant: "secondary",
          isDestructive: true,
          onClick: handleDisconnect,
          disabled: disconnecting,
          children: disconnecting ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Disconnecting…', 'ai-seo-tool')]
          }) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Disconnect Plugin', 'ai-seo-tool')
        })]
      })]
    })
  });
}

/***/ },

/***/ "./src/components/EngineScoreCard.jsx"
/*!********************************************!*\
  !*** ./src/components/EngineScoreCard.jsx ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ EngineScoreCard)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _GeoScoreRing__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./GeoScoreRing */ "./src/components/GeoScoreRing.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);
/**
 * AI SEO Tool — EngineScoreCard
 * Displays per-engine AI citation score as a card with a progress bar.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */



/**
 * @param {Object} props
 * @param {string} props.name  - Engine name (e.g. "ChatGPT").
 * @param {number} props.score - Score 0-100.
 * @param {string} props.focus - Short focus description for this engine.
 */

function EngineScoreCard({
  name,
  score,
  focus
}) {
  const color = (0,_GeoScoreRing__WEBPACK_IMPORTED_MODULE_1__.getScoreColor)(score || 0);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      style: {
        padding: '12px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        style: {
          fontSize: '12px',
          fontWeight: 400,
          color: '#757575',
          marginBottom: '6px'
        },
        children: name
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color,
          marginBottom: '6px'
        },
        children: score || 0
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        style: {
          height: '6px',
          borderRadius: '3px',
          backgroundColor: '#c3c4c7',
          overflow: 'hidden',
          marginBottom: '8px'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
          style: {
            height: '100%',
            width: `${score || 0}%`,
            backgroundColor: color,
            borderRadius: '3px',
            transition: 'width 0.4s ease'
          }
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
        style: {
          fontSize: '12px',
          fontWeight: 400,
          color: '#757575'
        },
        children: focus
      })]
    })
  });
}

/***/ },

/***/ "./src/components/GeoScoreRing.jsx"
/*!*****************************************!*\
  !*** ./src/components/GeoScoreRing.jsx ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ GeoScoreRing),
/* harmony export */   getScoreColor: () => (/* binding */ getScoreColor)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);

/**
 * AI SEO Tool — GeoScoreRing
 * Pure SVG score ring component re-implemented for the WordPress plugin.
 * Math identical to frontend/app/components/geo/GeoScoreRing.tsx.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */

/**
 * Returns the color for a given score value.
 *
 * @param {number} score 0-100
 * @returns {string} hex color
 */
function getScoreColor(score) {
  return score >= 80 ? '#16a34a' : score >= 65 ? '#ca8a04' : score >= 50 ? '#ea580c' : '#dc2626';
}

/**
 * @param {Object}  props
 * @param {number}  props.score  - Score value 0-100.
 * @param {number}  [props.size=120] - SVG size in px (default 120, smaller than main app's 140).
 * @param {string}  [props.grade] - Optional letter grade (A–F) to show below ring.
 */
function GeoScoreRing({
  score,
  size = 120,
  grade
}) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - (score || 0) / 100);
  const color = getScoreColor(score || 0);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("svg", {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: "#c3c4c7",
        strokeWidth: strokeWidth
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: color,
        strokeWidth: strokeWidth,
        strokeLinecap: "round",
        strokeDasharray: circumference,
        strokeDashoffset: offset,
        transform: `rotate(-90 ${cx} ${cy})`,
        style: {
          transition: 'stroke-dashoffset 0.8s ease'
        }
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("text", {
        x: "50%",
        y: "50%",
        textAnchor: "middle",
        dominantBaseline: "middle",
        fill: color,
        fontSize: size * 0.24,
        fontWeight: "600",
        children: score || 0
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("text", {
        x: "50%",
        y: "67%",
        textAnchor: "middle",
        dominantBaseline: "middle",
        fill: "#757575",
        fontSize: size * 0.1,
        children: "/ 100"
      })]
    }), grade && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
      style: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: '600'
      },
      children: grade
    })]
  });
}

/***/ },

/***/ "./src/components/PlanGate.jsx"
/*!*************************************!*\
  !*** ./src/components/PlanGate.jsx ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ PlanGate)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);
/**
 * AI SEO Tool — PlanGate
 * Upgrade prompt shown to free plan users on gated tabs.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */



/**
 * @param {Object} [props]
 * @param {string} [props.featureName] - Optional feature name override.
 */

function PlanGate({
  featureName
}) {
  const handleUpgrade = () => {
    window.open('http://localhost:3000/select-plan', '_blank');
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      style: {
        padding: '48px 24px',
        textAlign: 'center'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        className: "dashicons dashicons-lock",
        style: {
          fontSize: '28px',
          color: '#d97706',
          display: 'block',
          marginBottom: '16px'
        }
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("h2", {
        style: {
          margin: '0 0 12px',
          fontSize: '16px',
          fontWeight: 600
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Pro Feature', 'ai-seo-tool')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
        style: {
          color: '#757575',
          margin: '0 0 24px',
          maxWidth: '360px',
          marginLeft: 'auto',
          marginRight: 'auto'
        },
        children: featureName ? featureName : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This section is available on the Pro plan. Upgrade to access full GEO Analysis, Technical Audit details, and History trends.', 'ai-seo-tool')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
        variant: "primary",
        onClick: handleUpgrade,
        style: {
          backgroundColor: '#0d9488',
          borderColor: '#0d9488'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Upgrade Plan', 'ai-seo-tool')
      })]
    })
  });
}

/***/ },

/***/ "./src/components/tabs/DashboardTab.jsx"
/*!**********************************************!*\
  !*** ./src/components/tabs/DashboardTab.jsx ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DashboardTab)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../GeoScoreRing */ "./src/components/GeoScoreRing.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__);
/**
 * AI SEO Tool — DashboardTab
 * Shows GEO score gauge, HTTP status summary, pages crawled, and URLs table.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */






// ─── Semi-circle gauge ───────────────────────────────────────────────────────

function SemiCircleGauge({
  score,
  grade
}) {
  const cx = 60,
    cy = 72,
    r = 50,
    sw = 10;
  const halfC = Math.PI * r;
  const scoreLen = (score || 0) / 100 * halfC;
  const color = (0,_GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__.getScoreColor)(score || 0);
  const gradeLabel = score >= 80 ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Excellent', 'ai-seo-tool') : score >= 65 ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Good progress', 'ai-seo-tool') : score >= 50 ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Needs improvement', 'ai-seo-tool') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Needs critical work', 'ai-seo-tool');
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
      width: "120",
      height: "78",
      viewBox: "0 0 120 78",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: "#e2e8f0",
        strokeWidth: sw,
        strokeDasharray: `${halfC} ${halfC}`,
        transform: `rotate(180 ${cx} ${cy})`
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: color,
        strokeWidth: sw,
        strokeLinecap: "round",
        strokeDasharray: `${scoreLen} ${halfC * 2 - scoreLen}`,
        transform: `rotate(180 ${cx} ${cy})`,
        style: {
          transition: 'stroke-dasharray 0.8s ease'
        }
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("text", {
        x: "60",
        y: "62",
        textAnchor: "middle",
        fill: color,
        fontSize: "26",
        fontWeight: "700",
        children: score || 0
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("text", {
        x: "60",
        y: "75",
        textAnchor: "middle",
        fill: "#94a3b8",
        fontSize: "10",
        children: "/100"
      })]
    }), grade && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      style: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
        marginTop: '6px'
      },
      children: grade
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      style: {
        fontSize: '11px',
        color: '#6b7280',
        marginTop: '6px',
        textAlign: 'center'
      },
      children: gradeLabel
    })]
  });
}

// ─── Technical health mini-cards ─────────────────────────────────────────────

function TechPassIcon() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: "#16a34a"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("path", {
      d: "M7 12l3.5 3.5L17 8",
      stroke: "#fff",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })]
  });
}
function TechFailIcon() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "10",
      fill: "#dc2626"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("path", {
      d: "M8 8l8 8M16 8l-8 8",
      stroke: "#fff",
      strokeWidth: "2.2",
      strokeLinecap: "round"
    })]
  });
}
function TechCard({
  label,
  value,
  pass
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    style: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      flex: 1
    },
    children: [pass ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(TechPassIcon, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(TechFailIcon, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: pass ? '#16a34a' : '#dc2626',
          marginBottom: '2px'
        },
        children: label
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
        style: {
          fontSize: '13px',
          fontWeight: 600,
          color: '#1e293b'
        },
        children: value
      })]
    })]
  });
}

// ─── Status icons ─────────────────────────────────────────────────────────────

function IconCheck() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("rect", {
      x: "2",
      y: "2",
      width: "20",
      height: "20",
      rx: "4",
      fill: "#dcfce7"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("path", {
      d: "M7 12l3.5 3.5L17 8",
      stroke: "#16a34a",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })]
  });
}
function IconRedirect() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("rect", {
      x: "2",
      y: "2",
      width: "20",
      height: "20",
      rx: "4",
      fill: "#fef9c3"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("path", {
      d: "M7 12h10M13 8l4 4-4 4",
      stroke: "#ca8a04",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })]
  });
}
function IconWarning() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("rect", {
      x: "2",
      y: "2",
      width: "20",
      height: "20",
      rx: "4",
      fill: "#fee2e2"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "7",
      stroke: "#dc2626",
      strokeWidth: "1.5"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("line", {
      x1: "12",
      y1: "8",
      x2: "12",
      y2: "13",
      stroke: "#dc2626",
      strokeWidth: "2",
      strokeLinecap: "round"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
      cx: "12",
      cy: "16",
      r: "0.8",
      fill: "#dc2626"
    })]
  });
}
function IconServer() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("rect", {
      x: "2",
      y: "2",
      width: "20",
      height: "20",
      rx: "4",
      fill: "#ede9fe"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("rect", {
      x: "6",
      y: "7",
      width: "12",
      height: "4",
      rx: "1",
      stroke: "#7c3aed",
      strokeWidth: "1.5"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("rect", {
      x: "6",
      y: "13",
      width: "12",
      height: "4",
      rx: "1",
      stroke: "#7c3aed",
      strokeWidth: "1.5"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
      cx: "17",
      cy: "9",
      r: "0.8",
      fill: "#7c3aed"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
      cx: "17",
      cy: "15",
      r: "0.8",
      fill: "#7c3aed"
    })]
  });
}

// ─── Status code badge ────────────────────────────────────────────────────────

function StatusBadge({
  code
}) {
  const c = code || 0;
  const color = c >= 500 ? '#7c3aed' : c >= 400 ? '#dc2626' : c >= 300 ? '#ca8a04' : '#16a34a';
  const bg = c >= 500 ? '#ede9fe' : c >= 400 ? '#fee2e2' : c >= 300 ? '#fef9c3' : '#dcfce7';
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '12px',
      background: bg,
      color,
      fontSize: '11px',
      fontWeight: 600
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("svg", {
      width: "8",
      height: "8",
      viewBox: "0 0 8 8",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
        cx: "4",
        cy: "4",
        r: "3",
        fill: color
      })
    }), code || '—']
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} props.siteId - Analysis site/job ID.
 * @param {Object} props.data   - Site data from useAnalysis polling.
 * @param {Object} props.plan   - Plan object from usePlan.
 */
function DashboardTab({
  siteId,
  data,
  plan
}) {
  const [pages, setPages] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [geo, setGeo] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [audit, setAudit] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [pagesRes, geoRes, auditRes] = await Promise.all([_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/ai-seo-tool/v1/sites/${siteId}/pages`
        }), _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/ai-seo-tool/v1/sites/${siteId}/geo`
        }), _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/ai-seo-tool/v1/sites/${siteId}/audit`
        }).catch(() => null)]);
        if (!cancelled) {
          setPages(Array.isArray(pagesRes?.pages) ? pagesRes.pages : []);
          setGeo(geoRes);
          setAudit(auditRes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed to load dashboard data.', 'ai-seo-tool'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  const statusCounts = pages.reduce((acc, page) => {
    const code = page.status_code || 0;
    if (code >= 500) acc['5xx'] = (acc['5xx'] || 0) + 1;else if (code >= 400) acc['4xx'] = (acc['4xx'] || 0) + 1;else if (code >= 300) acc['3xx'] = (acc['3xx'] || 0) + 1;else if (code >= 200) acc['2xx'] = (acc['2xx'] || 0) + 1;
    return acc;
  }, {});
  const score = geo?.score?.overall_score || 0;
  const grade = geo?.score?.grade || '';

  // Technical health values
  const httpsOk = audit?.https?.secure === true;
  const sitemapOk = !!audit?.sitemap?.found;
  const brokenCount = audit?.broken_links?.count ?? (Array.isArray(audit?.broken_links?.links) ? audit.broken_links.links.length : null);
  const brokenOk = brokenCount === 0;
  const missingCanon = audit?.missing_canonicals?.count ?? (Array.isArray(audit?.missing_canonicals?.pages) ? audit.missing_canonicals.pages.length : null);
  const canonicalsOk = missingCanon === 0;
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '24px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
        style: {
          color: '#6b7280'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading dashboard…', 'ai-seo-tool')
      })]
    });
  }
  if (error) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "error",
      isDismissible: false,
      children: error
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr 1.4fr',
        gap: '16px',
        marginBottom: '28px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        style: cardStyle,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            style: cardTitleStyle,
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('AI Citation Score', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "#94a3b8",
            strokeWidth: "2",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("circle", {
              cx: "12",
              cy: "12",
              r: "10"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("line", {
              x1: "12",
              y1: "16",
              x2: "12",
              y2: "12"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("line", {
              x1: "12",
              y1: "8",
              x2: "12.01",
              y2: "8"
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            display: 'flex',
            justifyContent: 'center'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(SemiCircleGauge, {
            score: score,
            grade: grade
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        style: cardStyle,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            marginBottom: '16px'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            style: cardTitleStyle,
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('HTTP Status Summary', 'ai-seo-tool')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          },
          children: [{
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('2xx OK', 'ai-seo-tool'),
            key: '2xx',
            Icon: IconCheck,
            color: '#16a34a'
          }, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('3xx Redirect', 'ai-seo-tool'),
            key: '3xx',
            Icon: IconRedirect,
            color: '#ca8a04'
          }, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('4xx Error', 'ai-seo-tool'),
            key: '4xx',
            Icon: IconWarning,
            color: '#dc2626'
          }, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('5xx Server', 'ai-seo-tool'),
            key: '5xx',
            Icon: IconServer,
            color: '#7c3aed'
          }].map(({
            label,
            key,
            Icon,
            color
          }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(Icon, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
                style: {
                  fontSize: '20px',
                  fontWeight: 700,
                  color,
                  lineHeight: 1.1
                },
                children: statusCounts[key] || 0
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
                style: {
                  fontSize: '11px',
                  color: '#6b7280'
                },
                children: label
              })]
            })]
          }, key))
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        style: cardStyle,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            marginBottom: '16px'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            style: cardTitleStyle,
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Technical Health', 'ai-seo-tool')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          },
          children: [{
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('HTTPS', 'ai-seo-tool'),
            value: audit ? httpsOk ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Secure', 'ai-seo-tool') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Not Secure', 'ai-seo-tool') : '—',
            pass: httpsOk
          }, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sitemap', 'ai-seo-tool'),
            value: audit ? sitemapOk ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Found', 'ai-seo-tool') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Not Found', 'ai-seo-tool') : '—',
            pass: sitemapOk
          }, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Broken Links', 'ai-seo-tool'),
            value: audit ? brokenOk ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('None Found', 'ai-seo-tool') : `${brokenCount} found` : '—',
            pass: brokenOk
          }, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Canonicals', 'ai-seo-tool'),
            value: audit ? canonicalsOk ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('OK', 'ai-seo-tool') : `${missingCanon} missing` : '—',
            pass: canonicalsOk
          }].map(({
            label,
            value,
            pass
          }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            },
            children: [audit ? pass ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(TechPassIcon, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(TechFailIcon, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
              style: {
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#e2e8f0'
              }
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
                style: {
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: audit ? pass ? '#16a34a' : '#dc2626' : '#94a3b8'
                },
                children: value
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
                style: {
                  fontSize: '11px',
                  color: '#6b7280'
                },
                children: label
              })]
            })]
          }, label))
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("h3", {
        style: {
          fontSize: '14px',
          fontWeight: 600,
          color: '#1e293b',
          margin: '0 0 12px'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Crawled URLs', 'ai-seo-tool')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
        style: {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            overflowX: 'auto'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("table", {
            style: {
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("thead", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("tr", {
                style: {
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc'
                },
                children: [{
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('URL', 'ai-seo-tool'),
                  w: '38%'
                }, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Status', 'ai-seo-tool'),
                  w: '9%'
                }, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Indexability', 'ai-seo-tool'),
                  w: '12%'
                }, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Title', 'ai-seo-tool'),
                  w: '21%'
                }, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('H1', 'ai-seo-tool'),
                  w: '15%'
                }, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Depth', 'ai-seo-tool'),
                  w: '5%'
                }].map(({
                  label,
                  w
                }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("th", {
                  style: {
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    width: w
                  },
                  children: label
                }, label))
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("tbody", {
              children: pages.length === 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("tr", {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  colSpan: "6",
                  style: {
                    padding: '32px',
                    textAlign: 'center',
                    color: '#94a3b8'
                  },
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No pages found.', 'ai-seo-tool')
                })
              }) : pages.map((page, idx) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("tr", {
                style: {
                  borderBottom: '1px solid #f1f5f9',
                  background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                },
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  style: {
                    padding: '10px 14px',
                    wordBreak: 'break-all'
                  },
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("a", {
                    href: page.address,
                    target: "_blank",
                    rel: "noreferrer",
                    style: {
                      color: '#0d9488',
                      textDecoration: 'none',
                      fontSize: '12px'
                    },
                    onMouseOver: e => {
                      e.currentTarget.style.textDecoration = 'underline';
                    },
                    onMouseOut: e => {
                      e.currentTarget.style.textDecoration = 'none';
                    },
                    children: page.address
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  style: {
                    padding: '10px 14px'
                  },
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(StatusBadge, {
                    code: page.status_code
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  style: {
                    padding: '10px 14px'
                  },
                  children: page.indexability === 'Indexable' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
                    style: {
                      color: '#16a34a',
                      fontSize: '12px',
                      fontWeight: 500
                    },
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Yes', 'ai-seo-tool')
                  }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
                    style: {
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: 500
                    },
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No', 'ai-seo-tool')
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  style: {
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#374151'
                  },
                  children: page.title || /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
                    style: {
                      color: '#94a3b8'
                    },
                    children: "\u2014"
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  style: {
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#374151'
                  },
                  children: page.h1 || /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
                    style: {
                      color: '#94a3b8'
                    },
                    children: "\u2014"
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  style: {
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#374151',
                    textAlign: 'center'
                  },
                  children: page.crawl_depth ?? '—'
                })]
              }, page.address || idx))
            })]
          })
        })
      })]
    })]
  });
}
const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};
const cardTitleStyle = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1e293b'
};

/***/ },

/***/ "./src/components/tabs/GeoAnalysisTab.jsx"
/*!************************************************!*\
  !*** ./src/components/tabs/GeoAnalysisTab.jsx ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ GeoAnalysisTab)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../GeoScoreRing */ "./src/components/GeoScoreRing.jsx");
/* harmony import */ var _EngineScoreCard__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../EngineScoreCard */ "./src/components/EngineScoreCard.jsx");
/* harmony import */ var _PlanGate__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../PlanGate */ "./src/components/PlanGate.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
/**
 * AI SEO Tool — GeoAnalysisTab
 * Shows full GEO Analysis with score, engine cards, 7 sub-tabs, and suggestions.
 * Free plan users see PlanGate instead.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */








/** Engine-specific focus descriptions used when data doesn't provide them. */

const ENGINE_FOCUS = {
  chatgpt: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Conversational + authoritative content', 'ai-seo-tool'),
  perplexity: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Citation-ready, factual depth', 'ai-seo-tool'),
  gemini: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Entity clarity + structured data', 'ai-seo-tool'),
  claude: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('E-E-A-T + trustworthiness signals', 'ai-seo-tool'),
  grok: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Real-time relevance + recency', 'ai-seo-tool')
};
const ENGINE_DISPLAY_NAMES = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok'
};

/**
 * @param {Object} props
 * @param {string} props.siteId - Analysis site/job ID.
 * @param {Object} props.plan   - Plan object from usePlan.
 */
function GeoAnalysisTab({
  siteId,
  plan
}) {
  const [geo, setGeo] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';

  // Free plan gate
  if (plan?.plan === 'free') {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_PlanGate__WEBPACK_IMPORTED_MODULE_6__["default"], {});
  }
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchGeo() {
      setLoading(true);
      setError(null);
      try {
        const res = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/ai-seo-tool/v1/sites/${siteId}/geo`
        });
        if (!cancelled) setGeo(res);
      } catch (err) {
        if (!cancelled) setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed to load GEO analysis data.', 'ai-seo-tool'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGeo();
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '24px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading GEO analysis…', 'ai-seo-tool')
      })]
    });
  }
  if (error) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "error",
      isDismissible: false,
      children: error
    });
  }
  if (!geo) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "info",
      isDismissible: false,
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('GEO analysis data not yet available.', 'ai-seo-tool')
    });
  }
  const score = geo.score?.overall_score || 0;
  const grade = geo.score?.grade || '';

  // Engine scores
  const engineScores = geo.score?.engine_scores || {};
  const engines = Object.entries(ENGINE_DISPLAY_NAMES).map(([key, name]) => ({
    key,
    name,
    score: Math.round(engineScores[key]?.score || 0),
    focus: engineScores[key]?.focus || ENGINE_FOCUS[key] || ''
  }));

  // Suggestions — backend returns { critical: [...], important: [...], optional: [...] }
  const critical = geo.suggestions?.critical || [];
  const important = geo.suggestions?.important || [];
  const optional = geo.suggestions?.optional || [];
  const suggestions = [...critical, ...important, ...optional];
  const geoData = geo.geo_data || geo;
  const subTabs = [{
    name: 'schema',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Schema', 'ai-seo-tool')
  }, {
    name: 'content',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Content', 'ai-seo-tool')
  }, {
    name: 'eeat',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('E-E-A-T', 'ai-seo-tool')
  }, {
    name: 'nlp',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('NLP', 'ai-seo-tool')
  }, {
    name: 'visibility',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Visibility', 'ai-seo-tool')
  }, {
    name: 'entity',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Entity', 'ai-seo-tool')
  }, {
    name: 'pages',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Pages', 'ai-seo-tool')
  }];
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
      style: {
        marginBottom: '16px'
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
        style: {
          padding: '24px'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__["default"], {
              score: score,
              grade: grade,
              size: 120
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
              style: {
                marginTop: '8px',
                fontSize: '12px',
                color: '#757575'
              },
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('AI Citation Score', 'ai-seo-tool')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
            style: {
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
              minWidth: '0'
            },
            children: engines.map(engine => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_EngineScoreCard__WEBPACK_IMPORTED_MODULE_5__["default"], {
              name: engine.name,
              score: engine.score,
              focus: engine.focus
            }, engine.key))
          })]
        })
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
      style: {
        marginBottom: '16px'
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
        style: {
          padding: '0'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TabPanel, {
          tabs: subTabs,
          children: tab => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
            style: {
              padding: '16px'
            },
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(SubTabContent, {
              tab: tab.name,
              geo: geoData
            })
          })
        })
      })
    }), suggestions.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
        style: {
          padding: '16px'
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h3", {
          style: {
            margin: '0 0 12px',
            fontSize: '13px',
            fontWeight: 600
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Recommendations', 'ai-seo-tool')
        }), [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Critical', 'ai-seo-tool'),
          items: critical,
          color: '#dc2626'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Important', 'ai-seo-tool'),
          items: important,
          color: '#ca8a04'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Optional', 'ai-seo-tool'),
          items: optional,
          color: '#757575'
        }].map(({
          label,
          items,
          color
        }) => items.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("details", {
          style: {
            marginBottom: '12px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("summary", {
            style: {
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color,
              marginBottom: '8px'
            },
            children: [label, " (", items.length, ")"]
          }), items.map((s, i) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("details", {
            style: {
              marginLeft: '16px',
              marginBottom: '8px'
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("summary", {
              style: {
                cursor: 'pointer',
                fontSize: '13px'
              },
              children: s.title || s.what || s.recommendation || `${label} issue ${i + 1}`
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
              style: {
                marginTop: '8px',
                marginLeft: '16px',
                fontSize: '13px',
                color: '#757575'
              },
              children: s.why || s.description || s.detail || ''
            })]
          }, i))]
        }, label))]
      })
    })]
  });
}

/** Renders content for each of the 7 sub-tabs. */
function SubTabContent({
  tab,
  geo
}) {
  const schema = geo?.schema_analysis || geo?.schema || {};
  const content = geo?.content_analysis || geo?.content || {};
  const eeat = geo?.eeat_analysis || geo?.eeat || {};
  const nlp = geo?.nlp_analysis || geo?.nlp || {};
  const visibility = geo?.visibility_analysis || geo?.visibility || {};
  const entity = geo?.entity_analysis || geo?.entity || {};
  const pages = geo?.page_scores || geo?.pages || [];
  switch (tab) {
    case 'schema':
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(MetricList, {
        items: [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Coverage', 'ai-seo-tool'),
          value: `${schema.coverage_pct || 0}%`
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Formats Present', 'ai-seo-tool'),
          value: (schema.formats_present || []).join(', ') || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Types Detected', 'ai-seo-tool'),
          value: (schema.types_detected || []).slice(0, 5).join(', ') || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Missing Types', 'ai-seo-tool'),
          value: (schema.missing_recommended || []).join(', ') || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('None', 'ai-seo-tool')
        }]
      });
    case 'content':
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(MetricList, {
        items: [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Avg Word Count', 'ai-seo-tool'),
          value: Math.round(content.avg_word_count || 0)
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Reading Level', 'ai-seo-tool'),
          value: content.reading_level || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('FAQ Pages', 'ai-seo-tool'),
          value: content.faq_pages || 0
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Thin Pages (<300 words)', 'ai-seo-tool'),
          value: content.thin_pages || 0
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Tone Score', 'ai-seo-tool'),
          value: content.tone_score || '—'
        }]
      });
    case 'eeat':
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(MetricList, {
        items: [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('E-E-A-T Score', 'ai-seo-tool'),
          value: `${eeat.score || 0} / 100`
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Trust Pages', 'ai-seo-tool'),
          value: (eeat.trust_pages_present || []).join(', ') || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Expertise Signals', 'ai-seo-tool'),
          value: (eeat.expertise_signals || []).join(', ') || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Blog Cadence', 'ai-seo-tool'),
          value: eeat.blog_cadence || '—'
        }]
      });
    case 'nlp':
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(MetricList, {
        items: [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Snippet Readiness', 'ai-seo-tool'),
          value: nlp.snippet_readiness || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Primary Intent', 'ai-seo-tool'),
          value: nlp.primary_intent || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Question Density', 'ai-seo-tool'),
          value: nlp.question_density || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Answer Quality Score', 'ai-seo-tool'),
          value: Math.round(nlp.answer_quality_score || 0)
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Synonym Richness', 'ai-seo-tool'),
          value: nlp.synonym_richness || '—'
        }]
      });
    case 'visibility':
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(MetricList, {
        items: [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Overall Mention Rate', 'ai-seo-tool'),
          value: `${Math.round(visibility.overall_mention_rate || 0)}%`
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Visibility Label', 'ai-seo-tool'),
          value: visibility.visibility_label || '—'
        }, ...Object.entries(visibility.engine_mention_rates || {}).map(([engine, rate]) => ({
          label: ENGINE_DISPLAY_NAMES[engine] || engine,
          value: `${Math.round(rate * 100)}%`
        }))]
      });
    case 'entity':
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(MetricList, {
        items: [{
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Entity Score', 'ai-seo-tool'),
          value: `${entity.score || 0} / 100`
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Establishment', 'ai-seo-tool'),
          value: entity.establishment_label || '—'
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Wikipedia', 'ai-seo-tool'),
          value: entity.wikipedia_found ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Found', 'ai-seo-tool') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Not found', 'ai-seo-tool')
        }, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('sameAs Profiles', 'ai-seo-tool'),
          value: (entity.same_as_profiles || []).length
        }]
      });
    case 'pages':
      {
        const sorted = [...(Array.isArray(pages) ? pages : [])].sort((a, b) => (a.score || 0) - (b.score || 0));
        if (sorted.length === 0) {
          return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
            style: {
              color: '#757575',
              fontSize: '13px'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No per-page scores available.', 'ai-seo-tool')
          });
        }
        return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
          style: {
            overflowX: 'auto'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("table", {
            className: "wp-list-table widefat fixed striped",
            style: {
              marginBottom: 0
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("thead", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('URL', 'ai-seo-tool')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Score', 'ai-seo-tool')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Grade', 'ai-seo-tool')
                })]
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("tbody", {
              children: sorted.slice(0, 50).map((p, i) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                  style: {
                    fontSize: '12px',
                    wordBreak: 'break-all'
                  },
                  children: p.url || '—'
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                  children: Math.round(p.score || 0)
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                  children: p.grade || '—'
                })]
              }, p.url || i))
            })]
          })
        });
      }
    default:
      return null;
  }
}

/** Simple metric list for sub-tab content. */
function MetricList({
  items
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("dl", {
    style: {
      margin: 0
    },
    children: items.map(({
      label,
      value
    }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid #f0f0f1'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("dt", {
        style: {
          fontSize: '13px',
          color: '#757575'
        },
        children: label
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("dd", {
        style: {
          fontSize: '13px',
          fontWeight: 600,
          margin: 0
        },
        children: value
      })]
    }, label))
  });
}

/***/ },

/***/ "./src/components/tabs/HistoryTab.jsx"
/*!********************************************!*\
  !*** ./src/components/tabs/HistoryTab.jsx ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ HistoryTab)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _PlanGate__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../PlanGate */ "./src/components/PlanGate.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__);
/**
 * AI SEO Tool — HistoryTab
 * Shows list of past analyses. Trend chart (future) gated to Pro plan.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */






/**
 * @param {Object} props
 * @param {Object} props.plan - Plan object from usePlan.
 */

function HistoryTab({
  plan
}) {
  const [history, setHistory] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';

  // Extract domain from WP site URL (e.g. "https://mysite.local" → "mysite.local")
  const siteDomain = (() => {
    try {
      return new URL(window.aiSeoTool?.siteUrl || '').hostname;
    } catch {
      return '';
    }
  })();
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    let cancelled = false;
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const path = siteDomain ? `/ai-seo-tool/v1/history?domain=${encodeURIComponent(siteDomain)}` : '/ai-seo-tool/v1/history';
        const res = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path
        });
        if (!cancelled) setHistory(Array.isArray(res?.items) ? res.items : []);
      } catch (err) {
        if (!cancelled) setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed to load audit history.', 'ai-seo-tool'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, []);
  const isFree = plan?.plan === 'free';
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '24px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading audit history…', 'ai-seo-tool')
      })]
    });
  }
  if (error) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "error",
      isDismissible: false,
      children: error
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    children: [isFree ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      style: {
        marginBottom: '16px'
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_PlanGate__WEBPACK_IMPORTED_MODULE_4__["default"], {
        featureName: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Score trend charts are available on the Pro plan. Upgrade to track your GEO citation score over time.', 'ai-seo-tool')
      })
    }) :
    /*#__PURE__*/
    /* Trend chart is a future enhancement — see Phase 09 plan 06+ */
    (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      style: {
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: '#f0f0f1',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#757575'
      },
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Score trend chart — coming soon.', 'ai-seo-tool')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
        style: {
          padding: '0'
        },
        children: history.length === 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
          style: {
            padding: '48px 24px',
            textAlign: 'center'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("h3", {
            style: {
              marginTop: 0
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No audits yet', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
            style: {
              color: '#757575'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)("Click 'Analyze This Site' to run your first GEO citation readiness audit.", 'ai-seo-tool')
          })]
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          style: {
            overflowX: 'auto'
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("table", {
            className: "wp-list-table widefat fixed striped",
            style: {
              marginBottom: 0
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("thead", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Date', 'ai-seo-tool')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Score', 'ai-seo-tool')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Grade', 'ai-seo-tool')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("th", {
                  scope: "col",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Pages Crawled', 'ai-seo-tool')
                })]
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("tbody", {
              children: history.map((item, idx) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  children: formatDate(item.analyzed_at)
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  children: Math.round(item.overall_score || 0)
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(GradeBadge, {
                    grade: item.grade,
                    score: item.overall_score
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                  children: item.pages_count || '—'
                })]
              }, item.id || idx))
            })]
          })
        })
      })
    })]
  });
}

/** Formats an ISO date string to a human-readable date. */
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
}

/** Grade badge with score color. */
function GradeBadge({
  grade,
  score
}) {
  if (!grade) return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
    children: '—'
  });
  const color = score >= 80 ? '#16a34a' : score >= 65 ? '#ca8a04' : score >= 50 ? '#ea580c' : '#dc2626';
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: color,
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: 600
    },
    children: grade
  });
}

/***/ },

/***/ "./src/components/tabs/TechnicalAuditTab.jsx"
/*!***************************************************!*\
  !*** ./src/components/tabs/TechnicalAuditTab.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ TechnicalAuditTab)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../GeoScoreRing */ "./src/components/GeoScoreRing.jsx");
/* harmony import */ var _PlanGate__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../PlanGate */ "./src/components/PlanGate.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);
/**
 * AI SEO Tool — TechnicalAuditTab
 * Shows HTTPS/sitemap/broken links/canonicals, security headers, and PageSpeed.
 * Free plan users see PlanGate instead.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */







const SECURITY_HEADERS = [{
  key: 'hsts',
  label: 'HSTS'
}, {
  key: 'content_security_policy',
  label: 'Content Security Policy'
}, {
  key: 'x_frame_options',
  label: 'X-Frame-Options'
}, {
  key: 'x_content_type_options',
  label: 'X-Content-Type-Options'
}, {
  key: 'referrer_policy',
  label: 'Referrer-Policy'
}];

/**
 * @param {Object} props
 * @param {string} props.siteId - Analysis site/job ID.
 * @param {Object} props.plan   - Plan object from usePlan.
 */
function TechnicalAuditTab({
  siteId,
  plan
}) {
  const [audit, setAudit] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';

  // Free plan gate
  if (plan?.plan === 'free') {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_PlanGate__WEBPACK_IMPORTED_MODULE_5__["default"], {});
  }
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchAudit() {
      setLoading(true);
      setError(null);
      try {
        const res = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/ai-seo-tool/v1/sites/${siteId}/audit`
        });
        if (!cancelled) setAudit(res);
      } catch (err) {
        if (!cancelled) setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed to load audit data.', 'ai-seo-tool'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAudit();
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '24px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading technical audit…', 'ai-seo-tool')
      })]
    });
  }
  if (error) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "error",
      isDismissible: false,
      children: error
    });
  }
  if (!audit) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
      status: "info",
      isDismissible: false,
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Technical audit data not yet available.', 'ai-seo-tool')
    });
  }
  const https = audit.https || {};
  const sitemap = audit.sitemap || {};
  const brokenLinks = audit.broken_links || [];
  const canonicals = audit.canonicals || {};
  const securityHeaders = audit.security_headers || {};
  const pagespeed = audit.pagespeed || {};
  const desktopScore = Math.round(pagespeed.desktop?.performance_score || pagespeed.desktop?.score || 0);
  const mobileScore = Math.round(pagespeed.mobile?.performance_score || pagespeed.mobile?.score || 0);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SummaryCard, {
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('HTTPS', 'ai-seo-tool'),
        pass: https.secure === true,
        passText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Secure', 'ai-seo-tool'),
        failText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Not Secure', 'ai-seo-tool')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SummaryCard, {
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sitemap', 'ai-seo-tool'),
        pass: sitemap.found === true,
        passText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Found', 'ai-seo-tool'),
        failText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Not Found', 'ai-seo-tool')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SummaryCard, {
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Broken Links', 'ai-seo-tool'),
        pass: brokenLinks.length === 0,
        passText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('None Found', 'ai-seo-tool'),
        failText: `${brokenLinks.length} ${(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('found', 'ai-seo-tool')}`
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SummaryCard, {
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Canonicals', 'ai-seo-tool'),
        pass: !(canonicals.missing_count > 0),
        passText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('OK', 'ai-seo-tool'),
        failText: `${canonicals.missing_count || 0} ${(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('missing', 'ai-seo-tool')}`
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
          style: {
            padding: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h3", {
            style: {
              margin: '0 0 12px',
              fontSize: '13px',
              fontWeight: 600
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Security Headers', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("ul", {
            style: {
              margin: 0,
              padding: 0,
              listStyle: 'none'
            },
            children: SECURITY_HEADERS.map(({
              key,
              label
            }) => {
              const pass = !!securityHeaders[key];
              return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("li", {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 0',
                  borderBottom: '1px solid #f0f0f1'
                },
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
                  className: `dashicons ${pass ? 'dashicons-yes-alt' : 'dashicons-dismiss'}`,
                  style: {
                    color: pass ? '#16a34a' : '#dc2626',
                    fontSize: '16px'
                  }
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
                  style: {
                    fontSize: '13px'
                  },
                  children: label
                })]
              }, key);
            })
          })]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
          style: {
            padding: '16px'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h3", {
            style: {
              margin: '0 0 16px',
              fontSize: '13px',
              fontWeight: 600
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('PageSpeed', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
            style: {
              display: 'flex',
              gap: '24px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
              style: {
                textAlign: 'center'
              },
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
                style: {
                  fontSize: '12px',
                  color: '#757575',
                  marginBottom: '8px'
                },
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Desktop', 'ai-seo-tool')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__["default"], {
                score: desktopScore,
                size: 80
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
              style: {
                textAlign: 'center'
              },
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
                style: {
                  fontSize: '12px',
                  color: '#757575',
                  marginBottom: '8px'
                },
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Mobile', 'ai-seo-tool')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_GeoScoreRing__WEBPACK_IMPORTED_MODULE_4__["default"], {
                score: mobileScore,
                size: 80
              })]
            })]
          }), (pagespeed.desktop || pagespeed.mobile) && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
            style: {
              marginTop: '16px'
            },
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(CoreWebVitals, {
              desktop: pagespeed.desktop,
              mobile: pagespeed.mobile
            })
          })]
        })
      })]
    })]
  });
}

/** Pass/fail summary card for audit overview items. */
function SummaryCard({
  label,
  pass,
  passText,
  failText
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Card, {
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CardBody, {
      style: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        className: `dashicons ${pass ? 'dashicons-yes-alt' : 'dashicons-dismiss'}`,
        style: {
          color: pass ? '#16a34a' : '#dc2626',
          fontSize: '24px',
          flexShrink: 0
        }
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
          style: {
            fontSize: '11px',
            color: '#757575',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          },
          children: label
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
          style: {
            fontSize: '13px',
            fontWeight: 600
          },
          children: pass ? passText : failText
        })]
      })]
    })
  });
}

/** Core Web Vitals metric grid. */
function CoreWebVitals({
  desktop,
  mobile
}) {
  const metrics = [{
    key: 'fcp',
    label: 'FCP'
  }, {
    key: 'lcp',
    label: 'LCP'
  }, {
    key: 'tbt',
    label: 'TBT'
  }, {
    key: 'cls',
    label: 'CLS'
  }, {
    key: 'speed_index',
    label: 'SI'
  }];
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
    style: {
      overflowX: 'auto'
    },
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12px'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("thead", {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("tr", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("th", {
            style: {
              textAlign: 'left',
              padding: '4px 8px',
              color: '#757575'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Metric', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("th", {
            style: {
              textAlign: 'right',
              padding: '4px 8px',
              color: '#757575'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Desktop', 'ai-seo-tool')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("th", {
            style: {
              textAlign: 'right',
              padding: '4px 8px',
              color: '#757575'
            },
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Mobile', 'ai-seo-tool')
          })]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("tbody", {
        children: metrics.map(({
          key,
          label
        }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("tr", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("td", {
            style: {
              padding: '4px 8px'
            },
            children: label
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("td", {
            style: {
              padding: '4px 8px',
              textAlign: 'right'
            },
            children: desktop?.[key] ?? '—'
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("td", {
            style: {
              padding: '4px 8px',
              textAlign: 'right'
            },
            children: mobile?.[key] ?? '—'
          })]
        }, key))
      })]
    })
  });
}

/***/ },

/***/ "./src/hooks/useAnalysis.js"
/*!**********************************!*\
  !*** ./src/hooks/useAnalysis.js ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ useAnalysis)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/**
 * AI SEO Tool — useAnalysis hook
 * Recursive setTimeout polling for analysis job status.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */



/**
 * Polls /ai-seo-tool/v1/sites/{siteId} every intervalMs until completed or failed.
 *
 * @param {string|null} siteId      - The site/job ID to poll. Polling starts when non-null.
 * @param {number}      intervalMs  - Poll interval in ms (default 3000).
 *
 * @return {{ status: string|null, data: Object|null, error: string|null, reset: Function }}
 */
function useAnalysis(siteId, intervalMs = 3000) {
  const [status, setStatus] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [data, setData] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const timeoutRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const activeRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(true);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!siteId) return;
    activeRef.current = true;
    setError(null);
    const poll = async () => {
      try {
        const result = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/ai-seo-tool/v1/sites/${siteId}`
        });
        if (!activeRef.current) return;
        setStatus(result.status);
        setData(result);
        if (result.status !== 'completed' && result.status !== 'failed') {
          timeoutRef.current = setTimeout(poll, intervalMs);
        }
        if (result.status === 'failed') {
          setError(result.error || 'Audit failed. Check the AI SEO Tool backend logs for details.');
        }
      } catch (err) {
        if (activeRef.current) {
          const msg = err.message || err.detail || '';
          const isGone = msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('crawl');
          if (isGone) {
            setError('expired');
            setStatus('expired');
          } else {
            timeoutRef.current = setTimeout(poll, intervalMs * 2);
          }
        }
      }
    };
    poll();
    return () => {
      activeRef.current = false;
      clearTimeout(timeoutRef.current);
    };
  }, [siteId, intervalMs]);
  const reset = () => {
    setStatus(null);
    setData(null);
    setError(null);
  };
  return {
    status,
    data,
    error,
    reset
  };
}

/***/ },

/***/ "./src/hooks/usePlan.js"
/*!******************************!*\
  !*** ./src/hooks/usePlan.js ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ usePlan)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/**
 * AI SEO Tool — usePlan hook
 * Fetches user plan data from /wp-json/ai-seo-tool/v1/me
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */



/**
 * Returns: { plan: { id, email, name, plan, audit_count, audit_limit } | null, loading: boolean, error: string | null }
 */
function usePlan() {
  const [plan, setPlan] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
      path: '/ai-seo-tool/v1/me'
    }).then(data => {
      setPlan(data);
      setLoading(false);
    }).catch(err => {
      setError(err.message || 'Failed to load plan info');
      setLoading(false);
    });
  }, []);
  return {
    plan,
    loading,
    error
  };
}

/***/ },

/***/ "react/jsx-runtime"
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
(module) {

module.exports = window["ReactJSXRuntime"];

/***/ },

/***/ "@wordpress/api-fetch"
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
(module) {

module.exports = window["wp"]["apiFetch"];

/***/ },

/***/ "@wordpress/components"
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["components"];

/***/ },

/***/ "@wordpress/element"
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
(module) {

module.exports = window["wp"]["element"];

/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["i18n"];

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _App__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./App */ "./src/App.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);
/**
 * AI SEO Tool — WordPress Admin React App
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */



const rootEl = document.getElementById('ai-seo-tool-root');
if (rootEl) {
  const root = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.createRoot)(rootEl);
  root.render(/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_App__WEBPACK_IMPORTED_MODULE_1__["default"], {}));
}
})();

/******/ })()
;
//# sourceMappingURL=index.js.map