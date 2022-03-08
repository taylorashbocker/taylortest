/*
The query layer is a GraphQL layer which is dynamically built based on a user's current ontology. This schema file contains
most of the code to make this happen.
 */
import {
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
    GraphQLNamedType,
    GraphQLFloat,
    GraphQLBoolean,
    GraphQLList,
    GraphQLEnumType,
    GraphQLEnumValueConfig,
    GraphQLInputObjectType,
    GraphQLInt,
} from 'graphql';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import Metatype from '../domain_objects/data_warehouse/ontology/metatype';
import {stringToValidPropertyName} from '../services/utilities';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Logger from '../services/logger';
import MetatypeRelationshipPairRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';

// GraphQLSchemaGenerator takes a container and generates a valid GraphQL schema for all contained metatypes. This will
// allow users to query and filter data based on node type, the various properties that type might have, and other bits
// of metadata.
export default class GraphQLSchemaGenerator {
    #metatypeRepo: MetatypeRepository;
    #metatypePairRepo: MetatypeRelationshipPairRepository;

    constructor() {
        this.#metatypeRepo = new MetatypeRepository();
        this.#metatypePairRepo = new MetatypeRelationshipPairRepository();
    }

    // generate requires a containerID because the schema it generates is based on a user's ontology and ontologies are
    // separated by containers
    async ForContainer(containerID: string): Promise<Result<GraphQLSchema>> {
        // fetch all metatypes for the container, with their keys - the single most expensive call of this function
        let start = new Date().getTime()
        const metatypeResults = await this.#metatypeRepo.where().containerID('eq', containerID).list(true);
        if (metatypeResults.isError) return Promise.resolve(Result.Pass(metatypeResults));
        let end = new Date().getTime()
        console.log("List Metatypes", (end-start))

        start = new Date().getTime()
        // fetch all metatype relationship pairs - alternate to MetatypeRepo.
        const metatypePairResults = await this.#metatypePairRepo.where().containerID('eq', containerID).list();
        if (metatypePairResults.isError) return Promise.resolve(Result.Pass(metatypePairResults));
        end = new Date().getTime()
        console.log("List MT Pairs", (end-start))

        start = new Date().getTime()
        const metatypePairList: {[key: string]: any} = {};
        metatypePairResults.value.forEach((pair) => {
            const origin = stringToValidPropertyName(pair.name.split(' : ')[0])
            const rel = stringToValidPropertyName(pair.name.split(' : ')[1])
            const dest = stringToValidPropertyName(pair.name.split(' : ')[2])
            // populate list for forward searching
            if(!(origin in metatypePairList)){
                metatypePairList[origin] = {}
            } 
            if(!(rel in metatypePairList[origin])){
                metatypePairList[origin][rel] = {}
            }
            if(!(dest in metatypePairList[origin][rel])){
                metatypePairList[origin][rel][dest] = {type: GraphQLString}
            }
            // populate list for reverse searching
            if(!(dest in metatypePairList)){
                metatypePairList[dest] = {}
            } 
            if(!(rel in metatypePairList[dest])){
                metatypePairList[dest][rel] = {}
            }
            if(!(origin in metatypePairList[dest][rel])){
                metatypePairList[dest][rel][origin] = {type: GraphQLString}
            }
        })
        end = new Date().getTime()
        console.log("Pair List", (end - start))

        const metatypeGraphQLObjects: {[key: string]: any} = {};

        // we must declare the metadata input object beforehand so we can include it in the final schema entry for each
        // metatype
        const recordInputType = new GraphQLInputObjectType({
            name: 'record_input',
            fields: {
                data_source_id: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
                limit: {type: GraphQLInt, defaultValue: 10000},
                page: {type: GraphQLInt, defaultValue: 1},
            },
        });

        const recordInfo = new GraphQLObjectType({
            name: 'recordInfo',
            fields: {
                id: {type: GraphQLString},
                data_source_id: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
                metatype_id: {type: GraphQLString},
                metatype_name: {type: GraphQLString},
                created_at: {type: GraphQLString},
                created_by: {type: GraphQLString},
                modified_at: {type: GraphQLString},
                modified_by: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
            },
        });

        metatypeResults.value.forEach((metatype) => {

            const destinationInputType = new GraphQLInputObjectType({
                name: `${metatype.name}_destination_input`,
                // needed because the return type accepts an object, but throws a fit about it
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: {[key: string]: any}} = {};
                    if(metatypePairList[metatype.name]){
                        Object.keys(metatypePairList[metatype.name]).forEach((pair) => {
                            Object.keys(metatypePairList[metatype.name][pair]).forEach((dest) => {
                                fields[dest] = {type: GraphQLBoolean}
                            })
                        })
                    }
                    return fields;
                }
            })

            const relationshipInputType = new GraphQLInputObjectType({
                name: `${metatype.name}_relationship_input`,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                    if(metatypePairList[metatype.name]){
                        Object.keys(metatypePairList[metatype.name]).forEach((rel) => {
                            fields[rel] = {type: new GraphQLList(destinationInputType)}
                        })
                    }
                    return fields;
                }
            })

            const destinationInfo = new GraphQLObjectType({
                name: `${metatype.name}_destinationInfo`,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: any} = {};
                    if(metatypePairList[metatype.name]){
                        Object.keys(metatypePairList[metatype.name]).forEach((pair) => {
                            Object.keys(metatypePairList[metatype.name][pair]).forEach((dest) => {
                                fields[dest] = {type: GraphQLString}
                            })
                        })
                    }
                    return fields
                }
            })

            const relationshipInfo = new GraphQLObjectType({
                name: `${metatype.name}_relationshipInfo`,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: any} = {};
                    if(metatypePairList[metatype.name]){
                        Object.keys(metatypePairList[metatype.name]).forEach((pair) => {
                            fields[pair] = {type: destinationInfo}
                        })
                    }
                    return fields
                }
            })

            metatypeGraphQLObjects[stringToValidPropertyName(metatype.name)] = {
                args: {
                    ...this.inputFieldsForMetatype(metatype),
                    _record: {type: recordInputType},
                    _relationship: {type: relationshipInputType},
                },
                description: metatype.description,
                type: new GraphQLList(
                    new GraphQLObjectType({
                        name: stringToValidPropertyName(metatype.name),
                        // needed because the return type accepts an object, but throws a fit about it
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        fields: () => {
                            const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                            output._record = {type: recordInfo};
                            output._relationship = {type: relationshipInfo};
                            metatype.keys?.forEach((metatypeKey) => {
                                // keys must match the regex format of /^[_a-zA-Z][_a-zA-Z0-9]*$/ in order to be considered
                                // valid graphql property names. While we force the user to meet these requirements at key
                                // creation, we can't guarantee that legacy data will conform to these standards
                                const propertyName = stringToValidPropertyName(metatypeKey.property_name);

                                switch (metatypeKey.data_type) {
                                    // because we have no specification on our internal number type, we
                                    // must set this as a float for now
                                    case 'number': {
                                        output[propertyName] = {
                                            type: GraphQLFloat,
                                        };
                                        break;
                                    }

                                    case 'boolean': {
                                        output[propertyName] = {
                                            type: GraphQLBoolean,
                                        };
                                        break;
                                    }

                                    case 'string' || 'date' || 'file': {
                                        output[propertyName] = {
                                            type: GraphQLString,
                                        };
                                        break;
                                    }

                                    case 'list': {
                                        output[propertyName] = {
                                            type: new GraphQLList(GraphQLJSON),
                                        };
                                        break;
                                    }

                                    case 'enumeration': {
                                        const enumMap: {[key: string]: GraphQLEnumValueConfig} = {};

                                        if (metatypeKey.options) {
                                            metatypeKey.options.forEach((option) => {
                                                enumMap[option] = {
                                                    value: option,
                                                };
                                            });
                                        }

                                        output[propertyName] = {
                                            type: new GraphQLEnumType({
                                                name: stringToValidPropertyName(`${metatype.name}_${metatypeKey.name}_Enum_TypeA`),
                                                values: enumMap,
                                            }),
                                        };
                                        break;
                                    }

                                    default: {
                                        output[propertyName] = {
                                            type: GraphQLString,
                                        };
                                    }
                                }
                            });
                            
                            return output;
                        },
                    }),
                ),
                resolve: this.resolverForMetatype(containerID, metatype),
            };
        });

        const metatypeObjects = new GraphQLObjectType({
            name: 'metatypes',
            fields: metatypeGraphQLObjects
        })

        const test = new GraphQLObjectType({
            name: 'test',
            fields: {id: {type: GraphQLString}}
        })
        
        return Promise.resolve(
            Result.Success(
                new GraphQLSchema({
                    query: new GraphQLObjectType({
                        name: 'Query',
                        // fields: {
                        //     metatypes: {type: metatypeObjects},
                        //     relationships: {type: test},
                        // }
                        fields: metatypeGraphQLObjects,
                    }),
                }),
            ),
        );
    }

    resolverForMetatype(containerID: string, metatype: Metatype): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo = new NodeRepository();
            repo = repo.where().containerID('eq', containerID).and().metatypeID('eq', metatype.id);

            // you might notice that metatype_id and metatype_name are missing as filters - these are not
            // needed as we've already dictated what metatype to look for based on the query itself
            if (input._record) {
                if (input._record.data_source_id) {
                    const query = this.breakQuery(input._record.data_source_id);
                    repo = repo.and().dataSourceID(query[0], query[1]);
                }

                if (input._record.original_id) {
                    const query = this.breakQuery(input._record.original_id);
                    repo = repo.and().originalDataID(query[0], query[1]);
                }

                if (input._record.import_id) {
                    const query = this.breakQuery(input._record.import_id);
                    repo = repo.and().importDataID(query[0], query[1]);
                }
            }

            // variable to store results of edge DB call if _relationship input
            let edgeResults: {[key: string]: any} = {};
            if (input._relationship) {
                const edgeRepo = new EdgeRepository();

                // check input for the relationship type and destination metatype
                const relationship = Object.keys(input._relationship)[0];
                const destination = Object.keys(input._relationship[relationship][0])[0]
                
                // query to find all edges with specified relationship
                let start = new Date().getTime()
                edgeResults = await edgeRepo.findByRelationship(metatype.name, relationship.replace('_',' '), destination)
                if(edgeResults.value.length){
                    // store nodes connected as the origin of this relationship
                    const edge_ids: string[] = []
                    edgeResults.value.forEach((edge: any) => {
                        edge_ids.push(edge['origin_id'])
                    })
                    // query these matching nodes
                    repo = repo.and().id('in',edge_ids)
                } else {
                    // nothing is returned if no such relationships exist
                    repo = repo.and().id('eq', 0)
                }
                let end = new Date().getTime()
                console.log("Edge query",(end - start))
            }

            // we must map out what the graphql refers to a metatype's keys are vs. what they actually are so
            // that we can map the query properly
            const propertyMap: {
                [key: string]: {
                    name: string;
                    data_type: string;
                };
            } = {};

            metatype.keys?.forEach((key) => {
                propertyMap[stringToValidPropertyName(key.property_name)] = {
                    name: key.property_name,
                    data_type: key.data_type,
                };
            });

            // iterate through the input object, ignoring reserved properties and adding all others to
            // the query as property queries
            Object.keys(input).forEach((key) => {
                if ((key === '_record') || (key === '_relationship')) return;

                const query = this.breakQuery(String(input[key]));
                repo = repo.and().property(propertyMap[key].name, query[0], query[1], propertyMap[key].data_type);
            });

            // wrapping the end resolver in a promise ensures that we don't return prior to all results being
            // fetched
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            return new Promise((resolve) =>
                repo
                    .list(true, {limit: 10000})
                    .then((results) => {
                        if (results.isError) {
                            Logger.error(`unable to list nodes ${results.error?.error}`);
                            resolve([]);
                        }

                        const nodeOutput: {[key: string]: any}[] = [];

                        results.value.forEach((node) => {
                            const properties: {[key: string]: any} = {};
                            if (node.properties) {
                                Object.keys(node.properties).forEach((key) => {
                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                    // @ts-ignore
                                    properties[stringToValidPropertyName(key)] = node.properties[key];
                                });
                            }

                            // what needs to be returned here?

                            nodeOutput.push({
                                ...properties,
                                _record: {
                                    id: node.id,
                                    data_source_id: node.data_source_id,
                                    original_id: node.original_data_id,
                                    import_id: node.import_data_id,
                                    metatype_id: node.metatype_id,
                                    metatype_name: node.metatype_name,
                                    metadata: node.metadata,
                                    created_at: node.created_at?.toISOString(),
                                    created_by: node.created_by,
                                    modified_at: node.modified_at?.toISOString(),
                                    modified_by: node.modified_by,
                                },
                            });
                        });

                        resolve(nodeOutput);
                    })
                    .catch((e) => {
                        resolve(e);
                    }),
            );
        };
    }

    // each key in the metatype should be included on the input object as a field to be filtered on
    inputFieldsForMetatype(metatype: Metatype): {[key: string]: any} {
        const fields: {[key: string]: any} = {};

        metatype.keys?.forEach((metatypeKey) => {
            const propertyName = stringToValidPropertyName(metatypeKey.property_name);

            switch (metatypeKey.data_type) {
                // because we have no specification on our internal number type, we
                // must set this as a float for now
                case 'number': {
                    fields[propertyName] = {
                        type: GraphQLFloat,
                    };
                    break;
                }

                case 'boolean': {
                    fields[propertyName] = {
                        type: GraphQLBoolean,
                    };
                    break;
                }

                case 'string' || 'date' || 'file': {
                    fields[propertyName] = {
                        type: GraphQLString,
                    };
                    break;
                }

                case 'list': {
                    fields[propertyName] = {
                        type: new GraphQLList(GraphQLJSON),
                    };
                    break;
                }

                case 'enumeration': {
                    const enumMap: {[key: string]: GraphQLEnumValueConfig} = {};

                    if (metatypeKey.options) {
                        metatypeKey.options.forEach((option) => {
                            enumMap[option] = {
                                value: option,
                            };
                        });
                    }

                    // we have to include a UUID here so that we can insure a uniquely named type
                    fields[propertyName] = {
                        type: new GraphQLEnumType({
                            name: stringToValidPropertyName(`${metatype.name}_${metatypeKey.name}_Enum_Type_B`),
                            values: enumMap,
                        }),
                    };
                    break;
                }

                default: {
                    fields[propertyName] = {
                        type: GraphQLString,
                    };
                }
            }
        });

        return fields;
    }

    // breakQuery takes a string query and breaks off the operator from the rest of the query if present, if not present
    // defaults to the 'eq' operator
    private breakQuery(query: string): string[] {
        const parts = query.split(' ');

        // check to see if we have an operator, if not, return the 'eq' operator and the value
        if (!['eq', 'neq', 'like', 'in', '<', '>'].includes(parts[0])) {
            return ['eq', query];
        }

        const operator = parts.shift();

        return [operator as string, parts.join(' ')];
    }
}
