<template>
  <v-div>
    <v-row>
      <v-col>
        <v-select
            v-model="select"
            :items="adapterTypes()"
            @input="selectAdapter"
            :label="$t('exportNode.sourceType')"
            required
        ></v-select>
      </v-col>
      <v-col>
        <v-btn v-if="!icon" color="primary" dark class="mb-2" v-on="on">{{ $t('exportNode.exportNode') }}</v-btn>
      </v-col>
    </v-row>
  </v-div>
</template>


<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'

@Component
export default class CreateNodeDialog extends Vue {

  errorMessage = ""
  
  adapterTypes() {
    return [
      {text: this.$t('exportNode.jazz'), value: 'jazz'},
    ]
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
