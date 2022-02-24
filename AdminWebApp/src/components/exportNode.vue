<template>
  <v-div>
    <v-row>
      <v-col>
        <v-select
            v-model="nodeID"
            :items="adapterTypes()"
            @input="selectAdapter"
            :label="$t('exportNode.sourceType')"
            required
        ></v-select>
      </v-col>
      <v-col>
        <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on" @click="exportNode()">{{ $t('exportNode.exportNode') }}</v-btn>
      </v-col>
    </v-row>
  </v-div>
</template>


<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import {AzureServiceBusQueue} from '../../../src/services/queue/azure_service_bus_queue_impl.ts'
@Component
export default class CreateNodeDialog extends Vue {

  errorMessage = ""
  nodeID = "" 
  
  adapterTypes() {
    return [
      {text: this.$t('exportNode.jazz'), value: 'jazz'},
    ]
  }

  
  exportNode() {
    const queue = new AzureServiceBusQueue
    queue.Put("jazz_event_test", `{"post": ${this.nodeID}`)
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
