<template>
  <v-div>
    <v-row>
      <v-col>
        <v-select
            v-model="adapterSelect"
            :items="adapterTypes()"
            :label="$t('exportNode.sourceType')"
            required
        ></v-select>
      </v-col>
      <v-col>
        <v-btn color="primary" dark class="mb-2" @click="sendNode()">{{ $t('exportNode.exportNode') }}</v-btn>
      </v-col>
    </v-row>
  </v-div>
</template>


<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
@Component
export default class CreateNodeDialog extends Vue {

  @Prop({required: true})
  node!: any;

  errorMessage = ""
  adapterSelect = ""
  
  adapterTypes() {
    return [
      {text: this.$t('exportNode.jazz'), value: 'jazz'},
    ]
  }

  
  sendNode() {
    this.$client.sendToQueue(this.adapterSelect, this.node.id)
    .then(results => {
          this.$emit('sentToQueue', results)
        })
        .catch(e => this.errorMessage = this.$t('createNode.errorCreatingAPI') as string + e)
  }
  // newNode() {
  //   this.setProperties()
  //   this.$client.createNode(this.containerID,
  //     {
  //       "container_id": this.containerID,
  //       "data_source_id": this.dataSourceID,
  //       "metatype_id": this.metatype.id,
  //       "properties": this.property,
  //     }
  //   )
  //       .then(results => {
  //         this.dialog = false
  //         this.reset()
  //         this.$emit('nodeCreated', results[0])
  //       })
  //       .catch(e => this.errorMessage = this.$t('createNode.errorCreatingAPI') as string + e)
  // }
}

</script>
