import { createStoreModule, makeAction } from '../create-store';

/** @param {import('../../../types/config').SidebarSettings} settings */
function initialState(settings) {
  return {
    /**
     * The ID of the direct-linked group.
     *
     * This ID is initialized from the client's configuration to indicate that
     * the client should focus on a particular group initially. The user may
     * need to login for this step to complete. When the user navigates away
     * from the group or clears the selection, the direct link is "consumed"
     * and no longer used.
     *
     * @type {string|null}
     */
    directLinkedGroupId: settings.group || null,

    /**
     * The ID of the direct-linked annotation.
     *
     * This ID is initialized from the client's configuration to indicate that
     * the client should focus on a particular annotation. The user may need to
     * login to see the annotation. When the user clears the selection or
     * switches to a different group manually, the direct link is "consumed"
     * and no longer used.
     *
     * @type {string|null}
     */
    directLinkedAnnotationId: settings.annotations || null,

    /**
     * Indicates that an error occurred in retrieving/showing the direct linked group.
     * This could be because:
     * - the group does not exist
     * - the user does not have permission
     * - the group is out of scope for the given page
     * @type {boolean}
     */
    directLinkedGroupFetchFailed: false,
  };
}

/** @typedef {ReturnType<initialState>} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ directLinkedGroupFetchFailed: boolean }} action
   */
  UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED(state, action) {
    return {
      directLinkedGroupFetchFailed: action.directLinkedGroupFetchFailed,
    };
  },

  /**
   * @param {State} state
   * @param {{ directLinkedGroupId: string }} action
   */
  UPDATE_DIRECT_LINKED_GROUP_ID(state, action) {
    return {
      directLinkedGroupId: action.directLinkedGroupId,
    };
  },

  /**
   * @param {State} state
   * @param {{ directLinkedAnnotationId: string }} action
   */
  UPDATE_DIRECT_LINKED_ANNOTATION_ID(state, action) {
    return {
      directLinkedAnnotationId: action.directLinkedAnnotationId,
    };
  },

  CLEAR_DIRECT_LINKED_IDS() {
    return {
      directLinkedAnnotationId: null,
      directLinkedGroupId: null,
    };
  },

  CLEAR_SELECTION() {
    return {
      directLinkedAnnotationId: null,
      directLinkedGroupId: null,
      directLinkedGroupFetchFailed: false,
    };
  },
};

/**
 * Set the direct linked group id.
 */
function setDirectLinkedGroupId(groupId) {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_GROUP_ID', {
    directLinkedGroupId: groupId,
  });
}

/**
 * Set the direct linked annotation's id.
 */
function setDirectLinkedAnnotationId(annId) {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_ANNOTATION_ID', {
    directLinkedAnnotationId: annId,
  });
}

/**
 * Set the direct linked group fetch failure to true.
 */
function setDirectLinkedGroupFetchFailed() {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED', {
    directLinkedGroupFetchFailed: true,
  });
}

/**
 * Clear the direct linked group fetch failure.
 */
function clearDirectLinkedGroupFetchFailed() {
  return makeAction(reducers, 'UPDATE_DIRECT_LINKED_GROUP_FETCH_FAILED', {
    directLinkedGroupFetchFailed: false,
  });
}

/**
 * Clear the direct linked annotations and group IDs.
 *
 * This action indicates that the direct link has been "consumed" and should
 * not affect future group/annotation etc. fetches.
 */
function clearDirectLinkedIds() {
  return makeAction(reducers, 'CLEAR_DIRECT_LINKED_IDS', undefined);
}

/** @param {State} state */
function directLinkedAnnotationId(state) {
  return state.directLinkedAnnotationId;
}

/** @param {State} state */
function directLinkedGroupId(state) {
  return state.directLinkedGroupId;
}

/** @param {State} state */
function directLinkedGroupFetchFailed(state) {
  return state.directLinkedGroupFetchFailed;
}

export const directLinkedModule = createStoreModule(initialState, {
  namespace: 'directLinked',
  reducers,
  actionCreators: {
    setDirectLinkedGroupFetchFailed,
    setDirectLinkedGroupId,
    setDirectLinkedAnnotationId,
    clearDirectLinkedGroupFetchFailed,
    clearDirectLinkedIds,
  },
  selectors: {
    directLinkedAnnotationId,
    directLinkedGroupFetchFailed,
    directLinkedGroupId,
  },
});
