<template>
  <div>
      <q-card>
          <q-card-section class="text-overline">Randomizer <q-toggle v-model="options.randomizer.active" /></q-card-section>

          <q-slider-transition>
            <q-card-section class="q-ml-md" v-show="options.randomizer.active">

            </q-card-section>
          </q-slider-transition>
      </q-card>
  </div>
</template>

<script>
export default {
    props:{
        options:{
            type:Object,
            required:true
        }
    }
}
</script>

<style lang="stylus">

</style>