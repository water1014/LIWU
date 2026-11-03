/* ============================================================
   Shared UI kit
   ============================================================ */
const UI = {};

UI.Ico = {
  props: { name: { type: String, required: true }, size: { type: [Number, String], default: 20 }, sw: { type: [Number, String], default: 1.6 } },
  computed: { html() { return svgIco(this.name, Number(this.size), Number(this.sw)); } },
  template: '<span class="ico" style="display:inline-flex;line-height:0" v-html="html"></span>'
};

UI.Av = {
  props: {
    fileKey: { type: String, default: '' },
    name: { type: String, default: '' },
    size: { type: [Number, String], default: 40 },
    radius: { type: String, default: '50%' },
    tone: { type: String, default: '' }
  },
  data() { return { url: '' }; },
  watch: {
    fileKey: { immediate: true, handler(k) { this.load(k); } }
  },
  computed: {
    initial() { return U.initial(this.name); },
    bg() {
      const tones = ['linear-gradient(145deg,#C9C4B8,#A9A499)', 'linear-gradient(145deg,#B9C3B4,#94A18F)', 'linear-gradient(145deg,#C7B9B2,#A79590)', 'linear-gradient(145deg,#B7BEC9,#94A0AE)'];
      const i = Math.abs(U.hash(this.name || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % tones.length;
      return this.tone || tones[i];
    }
  },
  methods: {
    async load(k) {
      if (!k) { this.url = ''; return; }
      this.url = await A.resolveImg(k);
    }
  },
  template: `<div class="av" :style="{width:size+'px',height:size+'px',borderRadius:radius,background:url?'transparent':bg,display:'grid',placeItems:'center',overflow:'hidden'}">
      <img v-if="url" :src="url" style="width:100%;height:100%;object-fit:cover;display:block">
      <span v-else :style="{fontSize:Math.round(Number(size)*.36)+'px',fontWeight:600,color:'#fff',letterSpacing:'.02em'}">{{initial}}</span>
    </div>`
};

UI.Nav = {
  props: { title: { type: String, default: '' }, back: { type: Boolean, default: true }, border: { type: Boolean, default: false }, tone: { type: String, default: '' } },
  emits: ['back'],
  computed: { style() { return this.tone ? { background: this.tone } : {}; } },
  methods: { go() { this.$emit('back'); A.back(); } },
  template: `<div class="nav" :class="{bordered:border}" :style="style">
    <button v-if="back" class="nav-back" @click="go" aria-label="返回"><ico name="chevronLeft" :size="21" :sw="1.9"/></button>
    <div v-else style="width:34px"></div>
    <div class="nav-title">{{title}}</div>
    <div class="nav-act"><slot name="right"></slot></div>
  </div>`
};

UI.Sheet = {
  props: { modelValue: Boolean, title: String, sub: String, tall: Boolean },
  emits: ['update:modelValue'],
  template: `<template v-if="modelValue">
    <teleport to=".screen">
      <div class="backdrop" @click="$emit('update:modelValue',false)"></div>
      <div class="sheet" :style="tall?{maxHeight:'94%'}:{}">
        <div class="grabber"></div>
        <div v-if="title" class="sheet-title">{{title}}</div>
        <div v-if="sub" class="sheet-sub">{{sub}}</div>
        <div class="sheet-body"><slot></slot></div>
        <div v-if="$slots.footer" class="sheet-actions"><slot name="footer"></slot></div>
      </div>
    </teleport>
  </template>`
};

UI.Toggle = {
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template: '<button class="switch" :class="{on:modelValue}" @click="$emit(\'update:modelValue\', !modelValue)" role="switch" :aria-checked="modelValue"></button>'
};

UI.Seg = {
  props: { modelValue: [String, Number], options: { type: Array, default: () => [] } },
  emits: ['update:modelValue'],
  template: `<div class="segmented">
    <button v-for="o in options" :key="o.value" :class="{on:modelValue===o.value}" @click="$emit('update:modelValue',o.value)">
      <ico v-if="o.icon" :name="o.icon" :size="12"/>{{o.label}}
    </button>
  </div>`
};

UI.Empty = {
  props: { icon: { type: String, default: 'feather' }, title: String, sub: String },
  template: `<div class="empty">
    <div class="e-ico"><ico :name="icon" :size="24" :sw="1.4"/></div>
    <div class="e-title">{{title}}</div>
    <div class="e-sub">{{sub}}</div>
    <slot></slot>
  </div>`
};

UI.Row = {
  props: { title: String, sub: String, icon: String, value: String, arrow: Boolean, danger: Boolean },
  template: `<div class="row tap">
    <div v-if="icon" class="row-ico"><ico :name="icon" :size="16"/></div>
    <div class="row-main">
      <div class="row-title" :style="danger?{color:'var(--danger)'}:{}">{{title}}<slot name="title"></slot></div>
      <div v-if="sub" class="row-sub">{{sub}}</div>
    </div>
    <div v-if="value" class="row-val">{{value}}</div>
    <slot name="right"></slot>
    <ico v-if="arrow" name="chevronRight" :size="14" style="color:var(--muted-2);flex:none"/>
  </div>`
};

window.UI = UI;
