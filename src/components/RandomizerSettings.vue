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

                <div class="tagList q-mt-lg">
                    <div class="text-subtitle2">Defined Sets <q-btn color="primary" class="gt-xs" size="12px" flat dense round icon="add" @click="addSet" /></div>
                    
                    <q-list class="setList">
                        <q-item v-for="(s, i) in options.randomizer.sets" v-bind:key="s.uuid">
                            <q-item-section avatar>
                                <q-avatar color="primary" text-color="white" :disabled="i!=options.randomizer.previewIndex">
                                    {{ i }}
                                </q-avatar>
                            </q-item-section>   
                            <q-item-section>
                                <q-item-label>{{s.title}}</q-item-label>
                                <q-item-label caption lines="2">
                                    <div class="row q-mb-sm">
                                        <div :class="`tagItem q-ml-sm ${tagClass}`" v-for="tag in s.values" v-bind:key="tag.name">
                                        <div class="row no-wrap">
                                            <div class="tagInfo col-shrink">
                                                <div class="tagName">{{tag.tag}}</div>
                                                <div class="tagString">{{tag.value}}</div> 
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                </q-item-label>
                            </q-item-section>

                            <q-item-section side top>
                                <div class="text-grey-8 q-gutter-xs">
                                    <q-icon name="check" color="positive" />
                                    <q-btn class="gt-xs" size="12px" flat dense round icon="edit" />
                                    <q-btn class="gt-xs" size="12px" flat dense round icon="delete" />
                                </div>                            
                            </q-item-section>
                        </q-item>
                    </q-list>
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
        addSet(){

        },
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
.setList
    .tagItem
        .tagInfo
            padding-right:4px
            .tagName
                font-weight: inherit
                font-size:75%
            .tagString
                font-weight: bold
                color:black
                font-size:inherit
</style>