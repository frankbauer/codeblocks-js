<template>
  <div>
      <q-card>
          <q-card-section class="text-overline">Randomizer <q-toggle v-model="options.randomizer.active" /></q-card-section>

          <q-slide-transition>
            <q-card-section class="q-ml-md" v-show="options.randomizer.active">
                <div class="tagList">
                    <div class="text-subtitle2">Available Tags <q-btn color="primary" class="gt-xs" size="12px" flat dense round icon="add" @click="addTag" /></div>
                    <div class="row q-mb-sm">
                        <div :class="`tagItem q-ml-sm ${tagClass}`" v-for="tag in options.randomizer.knownTags" v-bind:key="tag">
                            <div class="row no-wrap">
                                <div class="tagInfo col-shrink">
                                    <div class="tagName">{{tag}}</div>
                                    <div class="tagString">{:{{tag}}}</div> 
                                </div>
                                <div class="tagAction col-4 q-pl-sm text-right">
                                    <q-btn class="gt-xs" size="12px" flat dense round icon="delete" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
            </q-card-section>
          </q-slide-transition>
      </q-card>
  </div>
</template>

<script>
import Vue from 'vue'
export default {
    data:function(){
        return {
            _newTagName:''
        }
    },
    props:{
        options:{
            type:Object,
            required:true
        }
    },
    computed:{
        tagClass(){return Vue.$tagger.className.rnd},
        newTagName:{
            get(){ return this._newTagName},
            set(v){
                
                this._newTagName = v
            }
        }
    },
    methods:{
        addTag(){
            this.newTagName = "NewTagName"
            this.$q.dialog({
                title: 'Create Tag',
                message: 'This will generate a new randomizer-Tag with the below name.',
                html: true,
                persistent: true,
                val:'me',
                prompt: {
                    model: this.newTagName,
                    type: 'text'
                },
                ok: {
                    push: true
                },
                cancel: {
                    flat:true,
                    color:'gray'
                },
                persistent: true
            }).onOk((data) => {
                data = data.replace(/\W/g, '_');
                //have this name
                if (this.options.randomizer.knownTags.filter(t=>t==data).length>0){
                    let ct = 1;
                    const odata = data;
                    do {
                        data = odata+"_"+ct;
                        ct++
                    } while (this.options.randomizer.knownTags.filter(t=>t==data).length>0)
                    
                }
                this.options.randomizer.knownTags.push(data);
            }).onCancel(() => {                
            }).onDismiss(() => {
                //self.highlighted = false;                
            })
        }
    }
}
</script>

<style lang="stylus" scoped>
@import '../styles/quasar.variables.styl'
.tagItem
    width:auto
    padding-bottom:1px    
    .tagInfo
        padding-left:4px
        .tagName
            font-weight: bold
        .tagString
            margin-top: -4px
            color:$blue-grey-4
            font-size:75%
    .tagAction
        padding-top:2px
        color:$blue-grey-8
        min-width:36px
</style>