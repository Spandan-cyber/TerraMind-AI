/**
 * ClickSpark - High-tech Click Particle Burst
 * TerraMind Emerald Theme Edition
 */

(function (global) {
  const defaults = {
    sparkColor: '#10b981',
    sparkSize: 12,
    sparkRadius: 35,
    sparkCount: 10,
    duration: 500,
    easing: 'ease-out',
    extraScale: 1.0
  };

  function easeOut(t) {
    return t * (2 - t);
  }

  class ClickSparkEngine {
    constructor(options = {}) {
      this.options = Object.assign({}, defaults, options);
      this.sparks = [];
      this.initCanvas();
      this.bindEvents();
    }

    initCanvas() {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'click-spark-canvas';
      this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 99999;
      `;
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    trigger(x, y, customOpts = {}) {
      const opts = Object.assign({}, this.options, customOpts);
      const now = performance.now();
      const count = opts.sparkCount;

      for (let i = 0; i < count; i++) {
        this.sparks.push({
          x,
          y,
          angle: (2 * Math.PI * i) / count + (Math.random() - 0.5) * 0.2,
          startTime: now,
          color: opts.sparkColor,
          size: opts.sparkSize,
          radius: opts.sparkRadius,
          duration: opts.duration,
          extraScale: opts.extraScale
        });
      }
    }

    bindEvents() {
      window.addEventListener(
        'click',
        e => {
          this.trigger(e.clientX, e.clientY);
        },
        { passive: true }
      );
    }

    loop() {
      const draw = timestamp => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.sparks = this.sparks.filter(spark => {
          const elapsed = timestamp - spark.startTime;
          if (elapsed >= spark.duration) return false;

          const progress = elapsed / spark.duration;
          const eased = easeOut(progress);

          const distance = eased * spark.radius * spark.extraScale;
          const lineLength = spark.size * (1 - eased);

          const x1 = spark.x + distance * Math.cos(spark.angle);
          const y1 = spark.y + distance * Math.sin(spark.angle);
          const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
          const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

          this.ctx.strokeStyle = spark.color;
          this.ctx.lineWidth = 2.5;
          this.ctx.lineCap = 'round';
          this.ctx.shadowColor = spark.color;
          this.ctx.shadowBlur = 6;
          this.ctx.beginPath();
          this.ctx.moveTo(x1, y1);
          this.ctx.lineTo(x2, y2);
          this.ctx.stroke();

          return true;
        });

        requestAnimationFrame(draw);
      };

      requestAnimationFrame(draw);
    }
  }

  function init(options) {
    if (!global._clickSparkInstance) {
      global._clickSparkInstance = new ClickSparkEngine(options);
    }
    return global._clickSparkInstance;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  global.ClickSpark = {
    init: init,
    trigger: (x, y, opts) => global._clickSparkInstance?.trigger(x, y, opts)
  };
})(window);
