<template>
  <div id="app">
    <HelloWorld msg="中文繁体" />
    <test msg="测试" />
    <div>{{ text }}</div>
    <button @click="change()">转换</button>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue';
import Test from './components/Test.vue';

export default {
  name: 'App',
  components: {
    HelloWorld,
    Test,
  },
  data() {
    return {
      text: 'A系鞋带',
    };
  },
  methods: {
    change() {
      this.text = '联系';
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
