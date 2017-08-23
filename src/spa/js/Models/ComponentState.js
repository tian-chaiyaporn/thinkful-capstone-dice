import {BASE_URL, PORT} from '../Utils/constants'

const COMPONENTS_OBJ = {};

// add component to COMPONENTS_OBJ for caching
const addComponentToState = (key, component) => {
  COMPONENTS_OBJ[key] = component;
}

// return a COMPONENT by key from in-memory
const getComponent = (key) => {
  return new Promise((res) => {
    if (COMPONENTS_OBJ[key]) {
      res(COMPONENTS_OBJ[key]);
    } else {
      getComponentAPI(key).then(() => res(COMPONENTS_OBJ[key]));
    }
  });
}

// get component templates from api
const getComponentAPI = (name) => {
  return new Promise((res, rej) => {
    const target = `/static/${name}.html`;
    const urlString = `${target}`;
    $.ajax({url: urlString})
      .done((component) => {
        addComponentToState(name, component);
        res(component);
        return;
      })
      .fail((err) => {rej(`cannot get component - Error: ${err}`)});
  })
};

export default {getComponent};
