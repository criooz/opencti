import { head } from 'ramda';
import { delEditContext, setEditContext } from '../database/redis';
import {
  createRelation,
  deleteByID,
  deleteRelation,
  editInputTx,
  loadByID,
  notify,
  now,
  paginate,
  qk
} from '../database/grakn';
import { BUS_TOPICS } from '../config/conf';

export const findAll = args => paginate('match $m isa Group', args);

export const findById = groupId => loadByID(groupId);

export const members = (groupId, args) =>
  paginate(
    `match $user isa User; 
    $rel((member:$user, grouping:$group) isa membership; 
    $group id ${groupId}`,
    args
  );

export const permissions = (groupId, args) =>
  paginate(
    `match $marking isa Marking-Definition; 
    $rel(allow:$marking, allowed:$group) isa permission; 
    $group id ${groupId}`,
    args
  );

export const addGroup = async (user, group) => {
  const createGroup = qk(`insert $group isa Group 
    has type "group";
    $group has name "${group.name}";
    $group has description "${group.description}";
    $group has name_lowercase "${group.name.toLowerCase()}";
    $group has description_lowercase "${
      group.description ? group.description.toLowerCase() : ''
    }";
    $group has created_at ${now()};
    $group has updated_at ${now()};
  `);
  return createGroup.then(result => {
    const { data } = result;
    return loadByID(head(data).group.id).then(created =>
      notify(BUS_TOPICS.Group.ADDED_TOPIC, created, user)
    );
  });
};

export const groupDelete = groupId => deleteByID(groupId);

export const groupAddRelation = (user, groupId, input) =>
  createRelation(groupId, input).then(relationData => {
    notify(BUS_TOPICS.Group.EDIT_TOPIC, relationData.node, user);
    return relationData;
  });

export const groupDeleteRelation = (user, groupId, relationId) =>
  deleteRelation(groupId, relationId).then(relationData => {
    notify(BUS_TOPICS.Group.EDIT_TOPIC, relationData.node, user);
    return relationData;
  });

export const groupCleanContext = (user, groupId) => {
  delEditContext(user, groupId);
  return loadByID(groupId).then(group =>
    notify(BUS_TOPICS.Group.EDIT_TOPIC, group, user)
  );
};

export const groupEditContext = (user, groupId, input) => {
  setEditContext(user, groupId, input);
  return loadByID(groupId).then(group =>
    notify(BUS_TOPICS.Group.EDIT_TOPIC, group, user)
  );
};

export const groupEditField = (user, groupId, input) =>
  editInputTx(groupId, input).then(group =>
    notify(BUS_TOPICS.Group.EDIT_TOPIC, group, user)
  );
